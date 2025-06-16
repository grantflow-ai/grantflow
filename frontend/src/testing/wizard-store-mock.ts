import { vi } from "vitest";

import type { FileWithId } from "@/components/workspaces/wizard/application-preview";

interface ApplicationState {
	application: any;
	applicationId: null | string;
	applicationTitle: string;
	templateId: null | string;
	wsConnectionStatus?: string;
	wsConnectionStatusColor?: string;
}

interface ContentState {
	uploadedFiles: FileWithId[];
	urls: string[];
}

interface WizardStoreMock {
	addFile: (file: FileWithId) => void;
	addUrl: (url: string) => void;
	applicationState: ApplicationState;
	contentState: ContentState;
	initializeApplication: (workspaceId: string) => Promise<void>;
	isCurrentStepValid: () => boolean;
	isLoading: boolean;
	isStep1Valid: () => boolean;
	removeFile: (fileToRemove: FileWithId) => void;
	removeUrl: (url: string) => void;
	resetWizard: () => void;
	setApplicationId: (id: string) => void;
	setApplicationTitle: (title: string) => void;
	setCurrentStep: (step: number) => void;
	setFileDropdownOpen: (fileId: string, open: boolean) => void;
	setLinkHoverState: (url: string, hovered: boolean) => void;
	setTemplateId: (id: string) => void;
	setUploadedFiles: (files: FileWithId[]) => void;
	setUrlInput: (input: string) => void;
	setUrls: (urls: string[]) => void;
	setWorkspaceId: (id: string) => void;
	setWsConnectionStatus: (status?: string) => void;
	setWsConnectionStatusColor: (color?: string) => void;
	toNextStep: () => void;
	toPreviousStep: () => void;
	ui: WizardUI;
	updateApplicationTitle: (title: string) => Promise<void>;
	workspaceId: string;
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
		mockWizardStore.contentState.urls = [...mockWizardStore.contentState.urls, url];
	}),
	applicationState: {
		application: null,
		applicationId: null,
		applicationTitle: "",
		templateId: null,
		wsConnectionStatus: undefined,
		wsConnectionStatusColor: undefined,
	},
	contentState: {
		uploadedFiles: [],
		urls: [],
	},
	initializeApplication: vi.fn().mockResolvedValue(undefined),
	isCurrentStepValid: vi.fn(() => false),
	isLoading: false,
	isStep1Valid: vi.fn(() => false),
	removeFile: vi.fn(),
	removeUrl: vi.fn((url: string) => {
		mockWizardStore.contentState.urls = mockWizardStore.contentState.urls.filter((u) => u !== url);
	}),
	resetWizard: vi.fn(),
	setApplicationId: vi.fn(),
	setApplicationTitle: vi.fn(),
	setCurrentStep: vi.fn(),
	setFileDropdownOpen: vi.fn((fileId: string, open: boolean) => {
		mockWizardStore.ui.fileDropdownStates[fileId] = open;
	}),
	setLinkHoverState: vi.fn((url: string, hovered: boolean) => {
		mockWizardStore.ui.linkHoverStates[url] = hovered;
	}),
	setTemplateId: vi.fn(),
	setUploadedFiles: vi.fn(),
	setUrlInput: vi.fn((input: string) => {
		mockWizardStore.ui.urlInput = input;
	}),
	setUrls: vi.fn(),
	setWorkspaceId: vi.fn(),
	setWsConnectionStatus: vi.fn(),
	setWsConnectionStatusColor: vi.fn(),
	toNextStep: vi.fn(),
	toPreviousStep: vi.fn(),
	ui: {
		currentStep: 0,
		fileDropdownStates: {},
		linkHoverStates: {},
		urlInput: "",
	},
	updateApplicationTitle: vi.fn().mockResolvedValue(undefined),
	workspaceId: "",
};

export { mockWizardStore };
export const mockUseWizardStore = vi.fn(() => mockWizardStore);
