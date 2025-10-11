import { assertIsNotNullish } from "@tool-belt/type-predicates";
import { deepmergeCustom } from "deepmerge-ts";
import ky, { HTTPError } from "ky";
import { toast } from "sonner";
import { create } from "zustand";
import {
	createApplication as handleCreateApplication,
	generateApplication as handleGenerateApplication,
	getApplication as handleGetApplication,
	updateApplication as handleUpdateApplication,
} from "@/actions/grant-applications";
import { generateGrantTemplate, updateGrantTemplate } from "@/actions/grant-template";
import {
	crawlApplicationUrl,
	crawlTemplateUrl,
	createApplicationSourceUploadUrl,
	createTemplateSourceUploadUrl,
	deleteApplicationSource,
	deleteTemplateSource,
} from "@/actions/sources";
import { DEFAULT_APPLICATION_TITLE } from "@/constants";
import { useOrganizationStore } from "@/stores/organization-store";
import type { API } from "@/types/api-types";
import type { FileWithId } from "@/types/files";
import type { GrantSection } from "@/types/grant-sections";
import { sectionWordLimit } from "@/types/grant-sections";
import { getEnv } from "@/utils/env";
import { setLengthConstraintWordLimit } from "@/utils/length-constraint";
import { log } from "@/utils/logger/client";
import { withRetry } from "@/utils/retry";
import { extractGrantTemplateValidationError } from "@/utils/validation";

export type ApplicationType = API.RetrieveApplication.Http200.ResponseBody | null;

const formatRagSources = (application: ApplicationType): string => {
	if (!application?.grant_template?.rag_sources) {
		return "files: [], urls: []";
	}

	const ragSources = application.grant_template.rag_sources;
	const files = ragSources
		.filter((source) => source.filename)
		.map((source) => `${source.filename}:${source.status}`)
		.join(", ");

	const urls = ragSources
		.filter((source) => source.url)
		.map((source) => `${source.url}:${source.status}`)
		.join(", ");

	return `files: [${files}], urls: [${urls}]`;
};

const formatGrantSections = (application: ApplicationType) => {
	return application?.grant_template?.grant_sections ?? [];
};

const formatApplicationRagSources = (application: ApplicationType): string => {
	if (!application?.rag_sources.length) {
		return "files: [], urls: []";
	}

	const ragSources = application.rag_sources;
	const files = ragSources
		.filter((source) => source.filename)
		.map((source) => `${source.filename}:${source.status}`)
		.join(", ");

	const urls = ragSources
		.filter((source) => source.url)
		.map((source) => `${source.url}:${source.status}`)
		.join(", ");

	return `files: [${files}], urls: [${urls}]`;
};

const arrayReplaceDeepMerge = deepmergeCustom({
	mergeArrays: (value) => {
		return value.at(-1);
	},
});

interface ApplicationState {
	application: ApplicationType;
	areAppOperationsInProgress: boolean;
	isSaving: boolean;
	pendingUploads: {
		application: Set<FileWithId>;
		template: Set<FileWithId>;
	};
	ragJobState: {
		isRestoring: boolean;
		restoredJob: API.RetrieveRagJob.Http200.ResponseBody | null;
	};
}

type SourceType = "application" | "template";

const initialState: ApplicationState = {
	application: null,
	areAppOperationsInProgress: false,
	isSaving: false,
	pendingUploads: {
		application: new Set(),
		template: new Set(),
	},
	ragJobState: {
		isRestoring: false,
		restoredJob: null,
	},
};

const validateStateForRagSource = (application: ApplicationType, parentId: string, actionName: string): boolean => {
	if (!application) {
		return false;
	}

	const isApplicationParent = parentId === application.id;
	const isTemplateParent = parentId === application.grant_template?.id;

	if (!(isApplicationParent || isTemplateParent)) {
		log.error(actionName, new Error(`Invalid parentId: ${parentId}. Must be application.id or grant_template.id`));
		return false;
	}

	return !(isTemplateParent && !application.grant_template);
};

const handleGrantTemplateValidationError = async (httpError: HTTPError): Promise<void> => {
	const errorMessage = await extractGrantTemplateValidationError(httpError);

	if (!errorMessage) {
		toast.error("Cannot generate grant template", {
			description: "Please ensure you have added a title and at least one document source.",
		});
		return;
	}

	if (errorMessage.includes("Grant template not found")) {
		toast.error("Grant template not found", {
			description: "The grant template could not be located. Please refresh and try again.",
		});
	} else if (errorMessage.includes("No rag sources found")) {
		toast.error("No documents available for generation", {
			description: "Add at least one document or URL to the knowledge base before generating the grant template.",
		});
	} else {
		toast.error("Cannot generate grant template", {
			description: "Please ensure you have added a title and at least one document source.",
		});
	}
};

export const getSubsectionsByParent = (sections: GrantSection[]) => {
	return sections.reduce<Record<string, GrantSection[]>>((acc, section) => {
		if (section.parent_id) {
			if (!(section.parent_id in acc)) {
				acc[section.parent_id] = [];
			}
			acc[section.parent_id].push(section);
		}
		return acc;
	}, {});
};

const syncSectionCharacterCount = (sections: API.UpdateGrantTemplate.RequestBody["grant_sections"]) => {
	if (!sections) {
		return {
			message: null,
			sections,
		};
	}

	const subsectionsByParent = sections.reduce<Partial<Record<string, (typeof sections)[number][]>>>(
		(acc, section) => {
			if (!section.parent_id) {
				return acc;
			}
			const existingGroup = acc[section.parent_id];
			if (existingGroup) {
				existingGroup.push(section);
				return acc;
			}
			acc[section.parent_id] = [section];
			return acc;
		},
		{},
	);

	const updatedSectionTargets: Record<string, number> = {};

	for (const parentId in subsectionsByParent) {
		const subsections = subsectionsByParent[parentId];
		if (!subsections) {
			continue;
		}
		const subsectionsTotalWords = subsections.reduce(
			(acc, subsection) => acc + (sectionWordLimit(subsection) ?? 0),
			0,
		);

		const parent = sections.find((section) => section.id === parentId);
		const parentWordLimit = parent ? sectionWordLimit(parent) : null;
		if (parentWordLimit === null || parentWordLimit < subsectionsTotalWords) {
			updatedSectionTargets[parentId] = subsectionsTotalWords;
		}
	}

	if (Object.keys(updatedSectionTargets).length > 0) {
		return {
			message: "Main section length target updated automatically to reflect changes in sub-sections.",
			sections: sections.map((section) =>
				section.id in updatedSectionTargets
					? {
							...section,
							length_constraint: setLengthConstraintWordLimit(
								section.length_constraint ?? null,
								updatedSectionTargets[section.id],
							),
						}
					: section,
			),
		};
	}

	return {
		message: null,
		sections,
	};
};

interface GrantSectionBase {
	[key: string]: unknown;
	id: string;
	order: number;
	parent_id: null | string;
	title: string;
}

const logGrantSectionsUpdate = (
	application: NonNullable<ApplicationType>,
	sections: GrantSectionBase[] | null | undefined,
	isSuccess: boolean,
	isOptimistic = false,
) => {
	const logType = isSuccess ? "info" : "error";
	let messagePrefix: string;
	if (isOptimistic) {
		messagePrefix = "optimistic";
	} else if (isSuccess) {
		messagePrefix = "API success";
	} else {
		messagePrefix = "API failure";
	}

	log[logType](`[rag_sources_check] Application state updated via updateGrantSections (${messagePrefix})`, {
		application_rag_sources: formatApplicationRagSources(application),
		applicationId: application.id,
		grant_sections: (sections ?? []).map((section) => ({
			id: section.id,
			order: section.order,
			parent_id: section.parent_id,
			title: section.title,
		})),
		projectId: application.project_id,
		sectionCount: (sections ?? []).length,
		template_rag_sources: formatRagSources(application),
		templateId: application.grant_template?.id,
	});
};

const updateGrantTemplateAPI = async (
	application: NonNullable<ApplicationType>,
	processedSections: API.UpdateGrantTemplate.RequestBody["grant_sections"],
) => {
	const { selectedOrganizationId } = useOrganizationStore.getState();
	if (!selectedOrganizationId) {
		throw new Error("No organization selected");
	}

	await updateGrantTemplate(
		selectedOrganizationId,
		application.project_id,
		application.id,
		application.grant_template?.id ?? "",
		{ grant_sections: processedSections },
	);
};

interface ApplicationActions {
	addFile: (file: FileWithId, parentId: string) => Promise<void>;
	addPendingUpload: (file: FileWithId, sourceType: SourceType) => void;
	addUrl: (url: string, parentId: string) => Promise<void>;
	clearPendingUploads: (sourceType?: SourceType) => void;
	clearRestoredJobState: () => void;
	createApplication: (organizationId: string, projectId: string) => Promise<void>;
	generateApplication: (organizationId: string, projectId: string, applicationId: string) => Promise<boolean>;
	generateTemplate: (templateId: string) => Promise<void>;
	getApplication: (organizationId: string, projectId: string, applicationId: string) => Promise<void>;
	removeFile: (file: FileWithId, parentId: string) => Promise<void>;
	removePendingUpload: (fileId: string, sourceType: SourceType) => void;
	removeUrl: (url: string, parentId: string) => Promise<void>;
	reset: () => void;
	setApplication: (application: NonNullable<ApplicationType>) => void;
	setSaving: (isSaving: boolean) => void;
	softReset: () => void;
	updateApplication: (data: Partial<API.UpdateApplication.RequestBody>) => Promise<void>;
	updateApplicationTitle: (
		organizationId: string,
		projectId: string,
		applicationId: string,
		title: string,
	) => Promise<void>;
	updateGrantSections: (sections: API.UpdateGrantTemplate.RequestBody["grant_sections"]) => Promise<void>;
}

const uploadFileInDevelopment = async (
	file: FileWithId,
	application: NonNullable<ApplicationType>,
	parentId: string,
	isApplicationParent: boolean,
) => {
	const { selectedOrganizationId } = useOrganizationStore.getState();
	if (!selectedOrganizationId) {
		throw new Error("No organization selected");
	}
	const { url } = isApplicationParent
		? await createApplicationSourceUploadUrl(selectedOrganizationId, application.project_id, parentId, file.name)
		: await createTemplateSourceUploadUrl(
				selectedOrganizationId,
				application.project_id,
				application.id,
				parentId,
				file.name,
			);

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

const uploadFileInProduction = async (
	file: FileWithId,
	application: NonNullable<ApplicationType>,
	parentId: string,
	isApplicationParent: boolean,
) => {
	const { selectedOrganizationId } = useOrganizationStore.getState();
	if (!selectedOrganizationId) {
		throw new Error("No organization selected");
	}
	const { url } = isApplicationParent
		? await createApplicationSourceUploadUrl(selectedOrganizationId, application.project_id, parentId, file.name)
		: await createTemplateSourceUploadUrl(
				selectedOrganizationId,
				application.project_id,
				application.id,
				parentId,
				file.name,
			);

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

export const useApplicationStore = create<ApplicationActions & ApplicationState>((set, get) => ({
	...initialState,

	addFile: async (file: FileWithId, parentId: string) => {
		const { application } = get();

		log.info("[file-upload] addFile called", {
			applicationId: application?.id,
			environment: process.env.NODE_ENV,
			fileId: file.id,
			fileName: file.name,
			fileSize: file.size,
			fileType: file.type,
			parentId,
			templateId: application?.grant_template?.id,
		});

		if (!validateStateForRagSource(application, parentId, "addFile")) {
			log.error("[file-upload] validateStateForRagSource failed", {
				applicationId: application?.id,
				fileName: file.name,
				hasApplication: !!application,
				parentId,
			});
			return;
		}

		const isApplicationParent = parentId === application!.id;

		log.info("[file-upload] Starting file upload process", {
			environment: process.env.NODE_ENV,
			fileId: file.id,
			fileName: file.name,
			isApplicationParent,
			parentId,
		});

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
				? uploadFileInDevelopment(file, application!, parentId, isApplicationParent)
				: uploadFileInProduction(file, application!, parentId, isApplicationParent));

			log.info("[file-upload] File upload completed successfully", {
				fileId: file.id,
				fileName: file.name,
				isApplicationParent,
				parentId,
			});

			toast.success(`File ${file.name} uploaded successfully`);
		} catch (error) {
			log.error("[file-upload] addFile upload failed", {
				error,
				fileId: file.id,
				fileName: file.name,
				isApplicationParent,
				parentId,
			});
			toast.error("Failed to upload file. Please try again.");
			throw error;
		}

		log.info("[rag_sources_check] File upload completed, triggering getApplication", {
			beforeApplicationRagSources: formatApplicationRagSources(application),
			beforeGrantSections: formatGrantSections(application),
			beforeRagSources: formatRagSources(application),
			fileName: file.name,
			isApplicationParent,
			parentId,
			templateId: application?.grant_template?.id,
		});

		const { selectedOrganizationId } = useOrganizationStore.getState();
		if (!selectedOrganizationId) return;

		await get().getApplication(selectedOrganizationId, application!.project_id, application!.id);
	},

	addPendingUpload: (file: FileWithId, sourceType: SourceType) => {
		set((state) => ({
			...state,
			pendingUploads: {
				...state.pendingUploads,
				[sourceType]: new Set([file, ...state.pendingUploads[sourceType]]),
			},
		}));

		log.info("[pending-upload] File added to pending uploads", {
			fileId: file.id,
			fileName: file.name,
			pendingCount: get().pendingUploads[sourceType].size + 1,
			sourceType,
		});
	},

	addUrl: async (url: string, parentId: string) => {
		const { application } = get();

		if (!validateStateForRagSource(application, parentId, "addUrl")) {
			return;
		}

		const isApplicationParent = parentId === application!.id;

		try {
			const { selectedOrganizationId } = useOrganizationStore.getState();
			if (!selectedOrganizationId) {
				throw new Error("No organization selected");
			}
			await (isApplicationParent
				? crawlApplicationUrl(selectedOrganizationId, application!.project_id, parentId, url)
				: crawlTemplateUrl(selectedOrganizationId, application!.project_id, application!.id, parentId, url));
			toast.success("URL added successfully");
			log.info("[rag_sources_check] URL crawl completed, triggering getApplication", {
				beforeApplicationRagSources: formatApplicationRagSources(application),
				beforeGrantSections: formatGrantSections(application),
				beforeRagSources: formatRagSources(application),
				isApplicationParent,
				parentId,
				templateId: application?.grant_template?.id,
				url,
			});

			await get().getApplication(selectedOrganizationId, application!.project_id, application!.id);
		} catch (error) {
			log.error("addUrl", error);
			toast.error("Failed to process URL. Please try again.");
		}
	},

	clearPendingUploads: (sourceType?: SourceType) => {
		if (sourceType) {
			const pendingCount = get().pendingUploads[sourceType].size;
			set((state) => ({
				...state,
				pendingUploads: {
					...state.pendingUploads,
					[sourceType]: new Set(),
				},
			}));
			log.info("[pending-upload] Cleared pending uploads for source type", {
				clearedCount: pendingCount,
				sourceType,
			});
		} else {
			const templateCount = get().pendingUploads.template.size;
			const applicationCount = get().pendingUploads.application.size;
			set((state) => ({
				...state,
				pendingUploads: {
					application: new Set(),
					template: new Set(),
				},
			}));
			log.info("[pending-upload] Cleared all pending uploads", {
				clearedCount: templateCount + applicationCount,
			});
		}
	},

	clearRestoredJobState: () => {
		set((state) => ({
			...state,
			ragJobState: {
				...state.ragJobState,
				restoredJob: null,
			},
		}));
	},

	createApplication: async (organizationId: string, projectId: string) => {
		set({ areAppOperationsInProgress: true });
		try {
			const response = await handleCreateApplication(organizationId, projectId, {
				title: DEFAULT_APPLICATION_TITLE,
			});
			log.info("[rag_sources_check] Application state updated via createApplication", {
				application_rag_sources: formatApplicationRagSources(response),
				applicationId: response.id,
				grant_sections: formatGrantSections(response),
				projectId,
				template_rag_sources: formatRagSources(response),
				templateId: response.grant_template?.id,
			});
			set({
				application: response,
				areAppOperationsInProgress: false,
			});
		} catch (e: unknown) {
			log.error("createApplication", e);
			toast.error("Failed to initialize application");
			set({ areAppOperationsInProgress: false });
		}
	},

	generateApplication: async (organizationId: string, projectId: string, applicationId: string) => {
		try {
			await withRetry(() => handleGenerateApplication(organizationId, projectId, applicationId), {
				initialDelay: 1000,
				maxRetries: 3,
				retryCondition: (error: unknown) => {
					if (error instanceof HTTPError) {
						const { status } = error.response;
						return status >= 500;
					}
					return true;
				},
			});

			log.info("Grant application generation initiated", {
				application_id: applicationId,
				project_id: projectId,
			});

			return true;
		} catch (error: unknown) {
			log.error("generateApplication", error);
			toast.error("Failed to generate grant application", {
				description: "An unexpected error occurred. Please try again.",
			});

			return false;
		}
	},

	generateTemplate: async (templateId: string) => {
		const { application } = get();

		assertIsNotNullish(application, {
			message: "Application should not be null when calling generateTemplate",
		});

		try {
			log.info("About to call generateGrantTemplate", {
				applicationId: application.id,
				projectId: application.project_id,
				templateId,
			});

			const traceId = await withRetry(
				() => {
					const { selectedOrganizationId } = useOrganizationStore.getState();
					if (!selectedOrganizationId) {
						throw new Error("No organization selected");
					}
					return generateGrantTemplate(
						selectedOrganizationId,
						application.project_id,
						application.id,
						templateId,
					);
				},
				{
					initialDelay: 1000,
					maxRetries: 3,
					retryCondition: (error: unknown) => {
						if (error instanceof HTTPError) {
							const { status } = error.response;

							return status >= 500;
						}
						return true;
					},
				},
			);

			log.info("Grant template generation initiated", {
				application_id: application.id,
				project_id: application.project_id,
				template_id: templateId,
				trace_id: traceId,
			});
		} catch (error: unknown) {
			if (error instanceof HTTPError && error.response.status === 422) {
				await handleGrantTemplateValidationError(error);
				return;
			}
			toast.error("Failed to generate grant template", {
				description: "An unexpected error occurred. Please try again.",
			});
		}
	},

	getApplication: async (organizationId: string, projectId: string, applicationId: string) => {
		set({ areAppOperationsInProgress: true });
		try {
			const response = await handleGetApplication(organizationId, projectId, applicationId);
			log.info("[rag_sources_check] Application state updated via getApplication", {
				application_rag_sources: formatApplicationRagSources(response),
				applicationId,
				grant_sections: formatGrantSections(response),
				projectId,
				template_rag_sources: formatRagSources(response),
				templateId: response.grant_template?.id,
			});

			const { pendingUploads } = get();
			const newTemplatePending = new Set(pendingUploads.template);
			const newApplicationPending = new Set(pendingUploads.application);
			let removedCount = 0;

			const templateFilenames = new Set<string>();
			response.grant_template?.rag_sources.forEach((source) => {
				if (source.filename) templateFilenames.add(source.filename);
			});

			const applicationFilenames = new Set<string>();
			response.rag_sources.forEach((source) => {
				if (source.filename) applicationFilenames.add(source.filename);
			});

			for (const pendingFile of pendingUploads.template) {
				if (templateFilenames.has(pendingFile.name)) {
					newTemplatePending.delete(pendingFile);
					removedCount++;
				}
			}

			for (const pendingFile of pendingUploads.application) {
				if (applicationFilenames.has(pendingFile.name)) {
					newApplicationPending.delete(pendingFile);
					removedCount++;
				}
			}

			if (removedCount > 0) {
				log.info("[pending-upload] Cleaned up pending uploads found in API", {
					remainingApplicationCount: newApplicationPending.size,
					remainingTemplateCount: newTemplatePending.size,
					removedCount,
				});
			}

			set({
				application: response,
				areAppOperationsInProgress: false,
				pendingUploads: {
					application: newApplicationPending,
					template: newTemplatePending,
				},
			});
		} catch (e: unknown) {
			log.error("getApplication", e);
			toast.error("Failed to retrieve application");
			set({ areAppOperationsInProgress: false });
		}
	},

	removeFile: async (fileToRemove: FileWithId, parentId: string) => {
		const { application } = get();

		if (!validateStateForRagSource(application, parentId, "removeFile")) {
			return;
		}

		if (!fileToRemove.id) {
			toast.error("Cannot remove file: File ID not found");
			return;
		}

		const isApplicationParent = parentId === application!.id;

		try {
			const { selectedOrganizationId } = useOrganizationStore.getState();
			if (!selectedOrganizationId) {
				throw new Error("No organization selected");
			}
			await (isApplicationParent
				? deleteApplicationSource(selectedOrganizationId, application!.project_id, parentId, fileToRemove.id)
				: deleteTemplateSource(
						selectedOrganizationId,
						application!.project_id,
						application!.id,
						parentId,
						fileToRemove.id,
					));
			toast.success(`File ${fileToRemove.name} removed`);
			log.info("[rag_sources_check] File removal completed, triggering getApplication", {
				beforeApplicationRagSources: formatApplicationRagSources(application),
				beforeGrantSections: formatGrantSections(application),
				beforeRagSources: formatRagSources(application),
				fileId: fileToRemove.id,
				fileName: fileToRemove.name,
				isApplicationParent,
				parentId,
				templateId: application?.grant_template?.id,
			});

			await get().getApplication(selectedOrganizationId, application!.project_id, application!.id);
		} catch (error) {
			log.error("removeFile", error);
			toast.error("Failed to remove file. Please try again.");
		}
	},

	removePendingUpload: (fileId: string, sourceType: SourceType) => {
		const { pendingUploads } = get();
		const fileToRemove = [...pendingUploads[sourceType]].find((file) => file.id === fileId);

		if (fileToRemove) {
			const newPendingUploads = new Set([...pendingUploads[sourceType]].filter((file) => file.id !== fileId));

			set((state) => ({
				...state,
				pendingUploads: {
					...state.pendingUploads,
					[sourceType]: newPendingUploads,
				},
			}));

			log.info("[pending-upload] File removed from pending uploads", {
				fileId,
				fileName: fileToRemove.name,
				remainingCount: newPendingUploads.size,
				sourceType,
			});
		}
	},

	removeUrl: async (urlToRemove: string, parentId: string) => {
		const { application } = get();
		if (!validateStateForRagSource(application, parentId, "removeUrl")) return;

		const isApplicationParent = parentId === application!.id;
		const ragSources = isApplicationParent
			? application!.rag_sources
			: (application!.grant_template?.rag_sources ?? []);
		const ragSource = ragSources.find((source) => source.url === urlToRemove);

		if (!ragSource) {
			toast.error("Cannot remove URL: Source not found");
			return;
		}

		try {
			const { selectedOrganizationId } = useOrganizationStore.getState();
			if (!selectedOrganizationId) throw new Error("No organization selected");

			await (isApplicationParent
				? deleteApplicationSource(selectedOrganizationId, application!.project_id, parentId, ragSource.sourceId)
				: deleteTemplateSource(
						selectedOrganizationId,
						application!.project_id,
						application!.id,
						parentId,
						ragSource.sourceId,
					));

			toast.success("URL removed successfully");
			await get().getApplication(selectedOrganizationId, application!.project_id, application!.id);
		} catch (error) {
			log.error("removeUrl error", error);
			toast.error("Failed to remove URL. Please try again.");
		}
	},

	reset: () => {
		const { application } = get();
		log.info("[rag_sources_check] Application state reset", {
			previous_application_rag_sources: formatApplicationRagSources(application),
			previous_grant_sections: formatGrantSections(application),
			previous_template_rag_sources: formatRagSources(application),
			previousApplicationId: application?.id,
			previousProjectId: application?.project_id,
			templateId: application?.grant_template?.id,
		});
		set(structuredClone(initialState));
	},

	setApplication: (application: NonNullable<ApplicationType>) => {
		log.info("[rag_sources_check] Application state updated via setApplication", {
			application_rag_sources: formatApplicationRagSources(application),
			applicationId: application.id,
			grant_sections: formatGrantSections(application),
			projectId: application.project_id,
			template_rag_sources: formatRagSources(application),
			templateId: application.grant_template?.id,
		});
		set({ application });
	},

	setSaving: (isSaving: boolean) => {
		set({ isSaving });
	},

	softReset: () => {
		const currentApplication = get().application;
		set({
			...structuredClone(initialState),
			application: currentApplication,
		});
	},

	updateApplication: async (data: Partial<API.UpdateApplication.RequestBody>) => {
		const existingApplication = get().application;

		assertIsNotNullish(existingApplication, {
			message: "Application should not be null when calling updateApplication",
		});

		set({ areAppOperationsInProgress: true, isSaving: true });

		const updatedApplication = arrayReplaceDeepMerge(existingApplication, data) as NonNullable<ApplicationType>;

		log.info("[rag_sources_check] Application state updated via updateApplication (optimistic)", {
			application_rag_sources: formatApplicationRagSources(updatedApplication),
			applicationId: updatedApplication.id,
			grant_sections: formatGrantSections(updatedApplication),
			projectId: updatedApplication.project_id,
			template_rag_sources: formatRagSources(updatedApplication),
			templateId: updatedApplication.grant_template?.id,
		});
		set({ application: updatedApplication });

		try {
			const { selectedOrganizationId } = useOrganizationStore.getState();
			if (!selectedOrganizationId) {
				throw new Error("No organization selected");
			}
			const response = await handleUpdateApplication(
				selectedOrganizationId,
				existingApplication.project_id,
				existingApplication.id,
				data,
			);
			log.info("[rag_sources_check] Application state updated via updateApplication (API success)", {
				application_rag_sources: formatApplicationRagSources(response),
				applicationId: response.id,
				grant_sections: formatGrantSections(response),
				projectId: response.project_id,
				template_rag_sources: formatRagSources(response),
				templateId: response.grant_template?.id,
			});
			set({ application: response });
		} catch (e) {
			log.info("[rag_sources_check] Application state reverted via updateApplication (API failure)", {
				application_rag_sources: formatApplicationRagSources(existingApplication),
				applicationId: existingApplication.id,
				grant_sections: formatGrantSections(existingApplication),
				projectId: existingApplication.project_id,
				template_rag_sources: formatRagSources(existingApplication),
				templateId: existingApplication.grant_template?.id,
			});
			set({ application: existingApplication });
			log.error("updateApplication", new Error(`Failed to update application: ${e}`));
			toast.error("Failed to update application");
		} finally {
			set({ areAppOperationsInProgress: false, isSaving: false });
		}
	},

	updateApplicationTitle: async (organizationId: string, projectId: string, applicationId: string, title: string) => {
		const { application } = get();

		assertIsNotNullish(application, {
			message: "Application must exist to update title",
		});

		const originalTitle = application.title;

		try {
			const response = await handleUpdateApplication(organizationId, projectId, applicationId, { title });
			log.info("[rag_sources_check] Application state updated via updateApplicationTitle", {
				application_rag_sources: formatApplicationRagSources(response),
				applicationId: response.id,
				grant_sections: formatGrantSections(response),
				projectId: response.project_id,
				template_rag_sources: formatRagSources(response),
				templateId: response.grant_template?.id,
				title: response.title,
			});
			set({ application: response });
		} catch (error) {
			const currentApplication = get().application;
			if (currentApplication) {
				const revertedApplication = {
					...currentApplication,
					title: originalTitle,
				};
				log.info("[rag_sources_check] Application state reverted via updateApplicationTitle (title restore)", {
					application_rag_sources: formatApplicationRagSources(revertedApplication),
					applicationId: revertedApplication.id,
					grant_sections: formatGrantSections(revertedApplication),
					projectId: revertedApplication.project_id,
					template_rag_sources: formatRagSources(revertedApplication),
					templateId: revertedApplication.grant_template?.id,
					title: revertedApplication.title,
				});
				set({
					application: revertedApplication,
				});
			}
			log.error("updateApplicationTitle", error);
			toast.error("Failed to update application title");
		}
	},

	updateGrantSections: async (sections: API.UpdateGrantTemplate.RequestBody["grant_sections"]) => {
		const { application } = get();
		const previousGrantSections = application?.grant_template?.grant_sections;

		if (!application?.grant_template?.id) {
			log.warn("updateGrantSections: No grant template ID found");
			return;
		}

		const createApplicationWithSections = (grantSections: typeof previousGrantSections | typeof sections) =>
			({
				...application,
				grant_template: {
					...application.grant_template,
					grant_sections: grantSections ?? [],
				},
			}) as NonNullable<ApplicationType>;

		const { message, sections: processedSections } = sections?.length
			? syncSectionCharacterCount(sections)
			: { message: null, sections };

		if (message) {
			toast.success(message);
			log.info("updateGrantSections: Section character count synced", { message });
		}

		const updatedApplication = createApplicationWithSections(processedSections);
		logGrantSectionsUpdate(updatedApplication, processedSections ?? [], true, true);
		set({ application: updatedApplication, isSaving: true });

		try {
			await updateGrantTemplateAPI(application, processedSections ?? []);
			log.info("updateGrantSections: Success", {
				grant_sections: (processedSections ?? []).map((section) => ({
					id: section.id,
					order: section.order,
					parent_id: section.parent_id,
					title: section.title,
				})),
				sectionCount: (sections ?? []).length,
			});
		} catch (error) {
			const restoredApplication = createApplicationWithSections(previousGrantSections);
			logGrantSectionsUpdate(restoredApplication, previousGrantSections ?? [], false);
			set({ application: restoredApplication });
			log.error("updateGrantSections: Failed", error);
			toast.error("Failed to update grant sections");
		} finally {
			set({ isSaving: false });
		}
	},
}));
