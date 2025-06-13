import { vi } from "vitest";

import type { FileWithId } from "@/components/workspaces/wizard/application-preview";

interface WizardStoreMock {
	addFile: (file: FileWithId) => void;
	addUrl: (url: string) => void;
	applicationId: null | string;
	applicationTitle: string;
	currentStep: number;
	goToNextStep: () => void;
	goToPreviousStep: () => void;
	initializeApplication: (workspaceId: string) => Promise<void>;
	isCreatingApplication: boolean;
	isCurrentStepValid: () => boolean;
	isStep1Valid: () => boolean;
	removeFile: (fileToRemove: FileWithId) => void;
	removeUrl: (url: string) => void;
	resetWizard: () => void;
	setApplicationId: (id: string) => void;
	setApplicationTitle: (title: string) => void;
	setCurrentStep: (step: number) => void;
	setFileDropdownOpen: (fileId: string, open: boolean) => void;
	setIsCreatingApplication: (loading: boolean) => void;
	setLinkHoverState: (url: string, hovered: boolean) => void;
	setTemplateId: (id: string) => void;
	setUploadedFiles: (files: FileWithId[]) => void;
	setUrlInput: (input: string) => void;
	setUrls: (urls: string[]) => void;
	setWorkspaceId: (id: string) => void;
	templateId: null | string;
	ui: WizardUI;
	updateApplicationTitle: (title: string) => Promise<void>;
	uploadedFiles: FileWithId[];
	urls: string[];
	workspaceId: string;
}

// Define types to match the real store
interface WizardUI {
	fileDropdownStates: Record<string, boolean>;
	linkHoverStates: Record<string, boolean>;
	urlInput: string;
}

const mockWizardStore: WizardStoreMock = {
	addFile: vi.fn(),
	addUrl: vi.fn((url: string) => {
		mockWizardStore.urls = [...mockWizardStore.urls, url];
	}),
	applicationId: null,
	applicationTitle: "",
	currentStep: 0,
	goToNextStep: vi.fn(),
	goToPreviousStep: vi.fn(),
	initializeApplication: vi.fn().mockResolvedValue(undefined),
	isCreatingApplication: false,
	isCurrentStepValid: vi.fn(() => false),
	isStep1Valid: vi.fn(() => false),
	removeFile: vi.fn(),
	removeUrl: vi.fn((url: string) => {
		mockWizardStore.urls = mockWizardStore.urls.filter((u) => u !== url);
	}),
	resetWizard: vi.fn(),
	setApplicationId: vi.fn(),
	setApplicationTitle: vi.fn(),
	setCurrentStep: vi.fn(),
	setFileDropdownOpen: vi.fn((fileId: string, open: boolean) => {
		mockWizardStore.ui.fileDropdownStates[fileId] = open;
	}),
	setIsCreatingApplication: vi.fn(),
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
	templateId: null,
	ui: {
		fileDropdownStates: {},
		linkHoverStates: {},
		urlInput: "",
	},
	updateApplicationTitle: vi.fn().mockResolvedValue(undefined),
	uploadedFiles: [],
	urls: [],
	workspaceId: "",
};

export { mockWizardStore };
export const mockUseWizardStore = vi.fn(() => mockWizardStore);
