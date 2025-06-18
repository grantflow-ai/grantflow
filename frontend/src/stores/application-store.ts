import { toast } from "sonner";
import { create } from "zustand";

import { createApplication, retrieveApplication, updateApplication } from "@/actions/grant-applications";
import { generateGrantTemplate } from "@/actions/grant-template";
import { FileWithId } from "@/components/workspaces/wizard/application-preview";
import { API } from "@/types/api-types";
import { logError } from "@/utils/logging";

export type ApplicationType = API.RetrieveApplication.Http200.ResponseBody | null;

export const DEFAULT_APPLICATION_TITLE = "Untitled Application";

interface ApplicationState {
	application: ApplicationType;
	isLoading: boolean;
	uploadedFiles: FileWithId[];
	urls: string[];
}

const initialState: ApplicationState = {
	application: null,
	isLoading: false,
	uploadedFiles: [],
	urls: [],
};

interface ApplicationActions {
	addFile: (file: FileWithId) => void;
	addUrl: (url: string) => void;
	areFilesOrUrlsIndexing: () => boolean;
	createApplication: (workspaceId: string) => Promise<void>;
	generateTemplate: (workspaceId: string, applicationId: string, templateId: string) => Promise<void>;
	handleApplicationInit: (workspaceId: string, applicationId?: string) => Promise<void>;
	removeFile: (fileToRemove: FileWithId) => void;
	removeUrl: (url: string) => void;
	retrieveApplication: (workspaceId: string, applicationId: string) => Promise<void>;
	setApplication: (application: Exclude<ApplicationType, null>) => void;
	setUploadedFiles: (files: FileWithId[]) => void;
	setUrls: (urls: string[]) => void;
	updateApplication: (workspaceId: string, applicationId: string, data: Partial<unknown>) => Promise<void>;
}

export const useApplicationStore = create<ApplicationActions & ApplicationState>((set, get) => ({
	...initialState,

	addFile: (file: FileWithId) => {
		set((state) => ({
			uploadedFiles: [...state.uploadedFiles, file],
		}));
	},

	addUrl: (url: string) => {
		set((state) => ({
			urls: state.urls.includes(url) ? state.urls : [...state.urls, url],
		}));
	},

	areFilesOrUrlsIndexing: () => {
		const { application } = get();
		if (!application) {
			return false;
		}

		const allSources = [...application.rag_sources, ...(application.grant_template?.rag_sources ?? [])];
		return allSources.some((source) => source.status === "INDEXING");
	},

	createApplication: async (workspaceId: string) => {
		set({ isLoading: true });
		try {
			const response = await createApplication(workspaceId, { title: DEFAULT_APPLICATION_TITLE });
			set({
				application: response,
				isLoading: false,
			});
		} catch (e: unknown) {
			logError({ error: e, identifier: "application-wizard-create" });
			toast.error("Failed to initialize application");
			set({ isLoading: false });
			throw e;
		}
	},

	generateTemplate: async (workspaceId: string, applicationId: string, templateId: string) => {
		set({ isLoading: true });
		try {
			await generateGrantTemplate(workspaceId, applicationId, templateId);
		} catch {
			toast.error("Failed to generate grant template. Please try again.");
		} finally {
			set({ isLoading: false });
		}
	},

	handleApplicationInit: async (workspaceId: string, applicationId?: string) => {
		set({ isLoading: true });
		try {
			await (applicationId
				? get().retrieveApplication(workspaceId, applicationId)
				: get().createApplication(workspaceId));
		} catch (e: unknown) {
			logError({ error: e, identifier: "handleApplicationInit" });
			toast.error(applicationId ? "Failed to retrieve application" : "Failed to initialize application");
			throw e;
		} finally {
			set({ isLoading: false });
		}
	},

	removeFile: (fileToRemove: FileWithId) => {
		set((state) => ({
			uploadedFiles: state.uploadedFiles.filter((f) => f.name !== fileToRemove.name),
		}));
	},

	removeUrl: (urlToRemove: string) => {
		set((state) => ({
			urls: state.urls.filter((url) => url !== urlToRemove),
		}));
	},

	retrieveApplication: async (workspaceId: string, applicationId: string) => {
		set({ isLoading: true });
		try {
			const response = await retrieveApplication(workspaceId, applicationId);
			set({
				application: response,
				isLoading: false,
			});
		} catch (e: unknown) {
			logError({ error: e, identifier: "retrieveApplication" });
			toast.error("Failed to retrieve application");
			set({ isLoading: false });
			throw e;
		}
	},

	setApplication: (application: Exclude<ApplicationType, null>) => {
		set({ application });
	},

	setUploadedFiles: (files: FileWithId[]) => {
		set({ uploadedFiles: files });
	},

	setUrls: (urls: string[]) => {
		set({ urls });
	},

	updateApplication: async (workspaceId: string, applicationId: string, data: Partial<unknown>) => {
		set({ isLoading: true });
		try {
			await updateApplication(workspaceId, applicationId, data);
			// Refresh the application to get the latest state
			await get().retrieveApplication(workspaceId, applicationId);
		} catch (e) {
			logError({ error: `Failed to update application: ${e}`, identifier: "updateApplication" });
			toast.error("Failed to update application");
		} finally {
			set({ isLoading: false });
		}
	},
}));
