import { vi } from "vitest";

import type { FileWithId } from "@/components/workspaces/wizard/application-preview";

interface ApplicationState {
	application: any;
	uploadedFiles: FileWithId[];
	urls: string[];
}

interface WizardStoreMock {
	addFile: (file: FileWithId) => void;
	addUrl: (url: string) => void;
	applicationState: ApplicationState;
	areFilesOrUrlsIndexing: () => boolean;
	initializeApplication: (workspaceId: string) => Promise<void>;
	isCurrentStepValid: () => boolean;
	isLoading: boolean;
	isStep1Valid: () => boolean;
	polling: {
		start: (callback: () => void, interval: number, immediate?: boolean) => void;
		stop: () => void;
	};
	removeFile: (fileToRemove: FileWithId) => void;
	removeUrl: (url: string) => void;
	resetWizard: () => void;
	retrieveApplication: (workspaceId: string, applicationId: string) => Promise<void>;
	setCurrentStep: (step: number) => void;
	setFileDropdownOpen: (fileId: string, open: boolean) => void;
	setLinkHoverState: (url: string, hovered: boolean) => void;
	setUploadedFiles: (files: FileWithId[]) => void;
	setUrlInput: (input: string) => void;
	setUrls: (urls: string[]) => void;
	toNextStep: () => void;
	toPreviousStep: () => void;
	ui: WizardUI;
	updateApplication: (workspaceId: string, applicationId: string, data: any) => Promise<void>;
}

// Define types to match the real store
interface WizardUI {
	currentStep: number;
	fileDropdownStates: Record<string, boolean>;
	linkHoverStates: Record<string, boolean>;
	urlInput: string;
}

const mockWizardStore: WizardStoreMock = {
	addFile: vi.fn(),
	addUrl: vi.fn((url: string) => {
		mockWizardStore.applicationState.urls = [...mockWizardStore.applicationState.urls, url];
	}),
	applicationState: {
		application: null,
		uploadedFiles: [],
		urls: [],
	},
	areFilesOrUrlsIndexing: vi.fn(() => false),
	initializeApplication: vi.fn().mockResolvedValue(undefined),
	isCurrentStepValid: vi.fn(() => false),
	isLoading: false,
	isStep1Valid: vi.fn(() => false),
	polling: {
		start: vi.fn(),
		stop: vi.fn(),
	},
	removeFile: vi.fn(),
	removeUrl: vi.fn((url: string) => {
		mockWizardStore.applicationState.urls = mockWizardStore.applicationState.urls.filter((u) => u !== url);
	}),
	resetWizard: vi.fn(),
	retrieveApplication: vi.fn().mockResolvedValue(undefined),
	setCurrentStep: vi.fn(),
	setFileDropdownOpen: vi.fn((fileId: string, open: boolean) => {
		mockWizardStore.ui.fileDropdownStates[fileId] = open;
	}),
	setLinkHoverState: vi.fn((url: string, hovered: boolean) => {
		mockWizardStore.ui.linkHoverStates[url] = hovered;
	}),
	setUploadedFiles: vi.fn(),
	setUrlInput: vi.fn((input: string) => {
		mockWizardStore.ui.urlInput = input;
	}),
	setUrls: vi.fn(),
	toNextStep: vi.fn(),
	toPreviousStep: vi.fn(),
	ui: {
		currentStep: 0,
		fileDropdownStates: {},
		linkHoverStates: {},
		urlInput: "",
	},
	updateApplication: vi.fn().mockResolvedValue(undefined),
};

export { mockWizardStore };
export const mockUseWizardStore = vi.fn(() => mockWizardStore);
