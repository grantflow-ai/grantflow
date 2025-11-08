"use client";

import ky from "ky";
import { toast } from "sonner";
import { create } from "zustand";
import {
	crawlGrantingInstitutionUrl as handleCrawlUrl,
	createGrantingInstitutionUploadUrl as handleCreateUploadUrl,
	deleteGrantingInstitutionSource as handleDeleteSource,
	getGrantingInstitution as handleGetInstitution,
	getGrantingInstitutionSources as handleGetSources,
} from "@/actions/granting-institutions";
import type { API } from "@/types/api-types";
import type { FileWithId } from "@/types/files";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger/client";

interface GrantingInstitutionState {
	institution: API.GetGrantingInstitution.Http200.ResponseBody | null;
	isLoading: boolean;
	pendingUploads: Set<FileWithId>;
	sources: API.RetrieveGrantingInstitutionRagSources.Http200.ResponseBody;
}

const initialState: GrantingInstitutionState = {
	institution: null,
	isLoading: false,
	pendingUploads: new Set(),
	sources: [],
};

const uploadFileInDevelopment = async (file: FileWithId, institutionId: string) => {
	const { url } = await handleCreateUploadUrl(institutionId, file.name);

	log.info("[file-upload] Upload URL created", {
		fileName: file.name,
		url: `${url.slice(0, 100)}...`,
	});

	const { extractObjectPathFromUrl } = await import("@/utils/dev-indexing-patch");
	const objectPath = extractObjectPathFromUrl(url);

	if (!objectPath) {
		log.error("[file-upload] Failed to extract object path from upload URL", {
			fileName: file.name,
			url,
		});
		throw new Error("Failed to extract object path from upload URL");
	}

	log.info("[file-upload] Extracted object path", {
		fileName: file.name,
		objectPath,
	});

	const env = getEnv();

	if (env.NEXT_PUBLIC_GCS_EMULATOR_URL) {
		const emulatorUrl = `${env.NEXT_PUBLIC_GCS_EMULATOR_URL}/upload/storage/v1/b/grantflow-uploads/o?uploadType=media&name=${objectPath}`;

		log.info("[file-upload] Uploading to GCS emulator", {
			contentType: file.type,
			emulatorUrl,
			fileName: file.name,
			fileSize: file.size,
		});

		await ky(emulatorUrl, {
			body: file,
			headers: {
				"Content-Type": file.type,
			},
			method: "POST",
		});

		log.info("[file-upload] Upload to GCS emulator completed", {
			fileName: file.name,
		});
	}

	const { triggerDevIndexing } = await import("@/utils/dev-indexing-patch");

	log.info("[file-upload] Triggering dev indexing", {
		fileName: file.name,
		objectPath,
	});

	setTimeout(() => {
		void triggerDevIndexing(objectPath);
	}, 500);

	log.info("[file-upload] uploadFileInDevelopment completed", {
		fileId: file.id,
		fileName: file.name,
	});
};

const uploadFileInProduction = async (file: FileWithId, institutionId: string) => {
	const { url } = await handleCreateUploadUrl(institutionId, file.name);

	log.info("[file-upload] Upload URL created", {
		fileName: file.name,
		url: `${url.slice(0, 100)}...`,
	});

	log.info("[file-upload] Uploading to production GCS", {
		contentType: file.type,
		fileName: file.name,
		fileSize: file.size,
	});

	await ky(url, {
		body: file,
		headers: {
			"Content-Type": file.type,
		},
		method: "PUT",
	});

	log.info("[file-upload] Upload to production GCS completed", {
		fileName: file.name,
	});

	const { extractObjectPathFromUrl, triggerDevIndexing } = await import("@/utils/dev-indexing-patch");
	const objectPath = extractObjectPathFromUrl(url);

	if (objectPath) {
		log.info("[file-upload] Triggering dev indexing", {
			fileName: file.name,
			objectPath,
		});
		void triggerDevIndexing(objectPath);
	} else {
		log.warn("[file-upload] No object path extracted for dev indexing", {
			fileName: file.name,
			url: `${url.slice(0, 100)}...`,
		});
	}

	log.info("[file-upload] uploadFileInProduction completed", {
		fileId: file.id,
		fileName: file.name,
	});
};

interface GrantingInstitutionActions {
	addFile: (file: FileWithId) => Promise<void>;
	addPendingUpload: (file: FileWithId) => void;
	addUrl: (url: string) => Promise<void>;
	clearPendingUploads: () => void;
	deleteSource: (sourceId: string) => Promise<void>;
	loadData: () => Promise<void>;
	removePendingUpload: (fileId: string) => void;
	reset: () => void;
	setInstitutionId: (id: string) => void;
}

export const useGrantingInstitutionStore = create<GrantingInstitutionActions & GrantingInstitutionState>(
	(set, get) => ({
		...initialState,

		addFile: async (file: FileWithId) => {
			const { institution } = get();

			if (!institution?.id) {
				log.error("[granting-institution] Cannot add file without institution ID");
				return;
			}

			log.info("[file-upload] addFile called", {
				environment: process.env.NODE_ENV,
				fileId: file.id,
				fileName: file.name,
				fileSize: file.size,
				fileType: file.type,
				institutionId: institution.id,
			});

			get().addPendingUpload(file);

			try {
				const backendApiUrl = getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL;
				const isLocalBackend = backendApiUrl.includes("localhost");
				const isDevelopment = process.env.NODE_ENV === "development";

				const useDevelopmentUpload = isDevelopment && isLocalBackend;

				log.info("[file-upload] Backend selection", {
					backendApiUrl,
					isDevelopment,
					isLocalBackend,
					uploadMethod: useDevelopmentUpload ? "development" : "production",
				});

				await (useDevelopmentUpload
					? uploadFileInDevelopment(file, institution.id)
					: uploadFileInProduction(file, institution.id));

				log.info("[file-upload] File upload completed successfully", {
					fileId: file.id,
					fileName: file.name,
					institutionId: institution.id,
				});

				toast.success(`File ${file.name} uploaded successfully`);
			} catch (error) {
				log.error("[file-upload] addFile upload failed", {
					error,
					fileId: file.id,
					fileName: file.name,
					institutionId: institution.id,
				});
				get().removePendingUpload(file.id);
				toast.error("Failed to upload file. Please try again.");
				throw error;
			}

			await get().loadData();
		},

		addPendingUpload: (file: FileWithId) => {
			set((state) => ({
				pendingUploads: new Set([file, ...state.pendingUploads]),
			}));

			log.info("[pending-upload] File added to pending uploads", {
				fileId: file.id,
				fileName: file.name,
				pendingCount: get().pendingUploads.size + 1,
			});
		},

		addUrl: async (url: string) => {
			const { institution } = get();

			if (!institution?.id) {
				log.error("[granting-institution] Cannot add URL without institution ID");
				return;
			}

			try {
				await handleCrawlUrl(institution.id, url);
				toast.success("URL added successfully");

				log.info("[granting-institution] URL added successfully", {
					institutionId: institution.id,
					url,
				});

				await get().loadData();
			} catch (error) {
				log.error("[granting-institution] Failed to add URL", { error, url });
				toast.error("Failed to add URL");
				throw error;
			}
		},

		clearPendingUploads: () => {
			const pendingCount = get().pendingUploads.size;
			set({ pendingUploads: new Set() });
			log.info("[pending-upload] Cleared all pending uploads", {
				clearedCount: pendingCount,
			});
		},

		deleteSource: async (sourceId: string) => {
			const { institution } = get();

			if (!institution?.id) {
				log.error("[granting-institution] Cannot delete source without institution ID");
				return;
			}

			try {
				await handleDeleteSource(institution.id, sourceId);
				toast.success("Source deleted successfully");

				log.info("[granting-institution] Source deleted successfully", {
					institutionId: institution.id,
					sourceId,
				});

				await get().loadData();
			} catch (error) {
				log.error("[granting-institution] Failed to delete source", { error, sourceId });
				toast.error("Failed to delete source");
			}
		},

		loadData: async () => {
			const { institution } = get();
			if (!institution?.id) {
				log.error("[granting-institution] Cannot load data without institution ID");
				return;
			}

			set({ isLoading: true });

			try {
				const [institutionData, sourcesData] = await Promise.all([
					handleGetInstitution(institution.id),
					handleGetSources(institution.id),
				]);

				const { pendingUploads } = get();
				const newPendingUploads = new Set(pendingUploads);
				let removedCount = 0;

				const sourceFilenames = new Set<string>();
				sourcesData.forEach((source) => {
					if ("filename" in source && source.filename) {
						sourceFilenames.add(source.filename);
					}
				});

				for (const pendingFile of pendingUploads) {
					if (sourceFilenames.has(pendingFile.name)) {
						newPendingUploads.delete(pendingFile);
						removedCount++;
					}
				}

				if (removedCount > 0) {
					log.info("[pending-upload] Cleaned up pending uploads found in API", {
						remainingCount: newPendingUploads.size,
						removedCount,
					});
				}

				set({
					institution: institutionData,
					isLoading: false,
					pendingUploads: newPendingUploads,
					sources: sourcesData,
				});

				log.info("[granting-institution] Data loaded successfully", {
					institutionId: institution.id,
					sourcesCount: sourcesData.length,
				});
			} catch (error) {
				log.error("[granting-institution] Failed to load data", { error, institutionId: institution.id });
				toast.error("Failed to load granting institution");
				set({ isLoading: false });
			}
		},

		removePendingUpload: (fileId: string) => {
			const { pendingUploads } = get();
			const fileToRemove = [...pendingUploads].find((file) => file.id === fileId);

			if (fileToRemove) {
				const newPendingUploads = new Set([...pendingUploads].filter((file) => file.id !== fileId));

				set({ pendingUploads: newPendingUploads });

				log.info("[pending-upload] File removed from pending uploads", {
					fileId,
					fileName: fileToRemove.name,
					remainingCount: newPendingUploads.size,
				});
			}
		},

		reset: () => {
			log.info("[granting-institution] Store reset");
			set(structuredClone(initialState));
		},

		setInstitutionId: (id: string) => {
			set({
				institution: { ...initialState.institution!, id } as API.GetGrantingInstitution.Http200.ResponseBody,
			});
		},
	}),
);
