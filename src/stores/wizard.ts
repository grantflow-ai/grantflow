import type { ValueType } from "@/components/wizard/dynamic-forms/form-components";
import { createStore } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Ref } from "@/utils/state";
import { StoreApi } from "zustand/vanilla";

const wizardStores = new Ref<Map<string, StoreApi<WizardStore>>>();

export type WizardStep = "overview" | "researchPlan";

export interface WizardStore {
	cfpIdentifier: string;
	// wizard step
	currentStep: WizardStep;
	setStep: (step: WizardStep) => void;
	// selected section
	currentSection: number;
	setSection: (section: number) => void;
	// answers
	answers: Record<WizardStep, Record<string, ValueType>>;
	setAnswer: (questionId: string, value: ValueType) => void;
	// progress
	progresses: Record<WizardStep, number>;
	setProgress: (progress: number) => void;
	// file upload
	fileIds: Record<string, string[]>;
	setFileIds: (questionId: string, fileIds: string[]) => void;
}

/**
 * Create a store for the wizard. The store is persisted in local storage and is specific to a CFP and a workspace.
 *
 * @param cfpIdentifier - The identifier of the CFP.
 * @param workspaceId - The id of the workspace.
 */
export function createWizardStore({
	cfpIdentifier,
	workspaceId,
}: {
	cfpIdentifier: string;
	workspaceId: string;
}) {
	return createStore(
		persist<WizardStore>(
			(set) => ({
				cfpIdentifier,
				currentStep: "overview",
				setStep: (step) => {
					set({ currentStep: step });
				},
				currentSection: 0,
				setSection: (section) => {
					set({ currentSection: section });
				},
				answers: {
					overview: {},
					researchPlan: {},
				},
				setAnswer: (questionId, value) => {
					set((state) => {
						return {
							answers: {
								...state.answers,
								[state.currentStep]: {
									...state.answers[state.currentStep],
									[questionId]: value,
								},
							},
						};
					});
				},
				progresses: {
					overview: 0,
					researchPlan: 0,
				},
				setProgress: (progress) => {
					set((state) => {
						return {
							progresses: {
								...state.progresses,
								[state.currentStep]: progress,
							},
						};
					});
				},
				fileIds: {},
				setFileIds: (questionId, fileIds) => {
					set((state) => {
						return {
							fileIds: {
								...state.fileIds,
								[questionId]: fileIds,
							},
						};
					});
				},
			}),
			{ name: `wizard-store-${cfpIdentifier}-${workspaceId}`, storage: createJSONStorage(() => localStorage) },
		),
	);
}

/**
 * Get the store for the wizard identified by the given cfpIdentifier and workspaceId. If the store doesn't exist, it is created.
 *
 * @param cfpIdentifier - The identifier of the CFP.
 * @param workspaceId - The id of the workspace.
 *
 * @returns The store for the wizard.
 */
export function getStore({
	cfpIdentifier,
	workspaceId,
}: {
	cfpIdentifier: string;
	workspaceId: string;
}) {
	const id = `${cfpIdentifier}-${workspaceId}`;
	if (!wizardStores.value) {
		wizardStores.value = new Map();
	}
	if (!wizardStores.value.has(id)) {
		wizardStores.value.set(workspaceId, createWizardStore({ cfpIdentifier, workspaceId }));
	}
	return wizardStores.value.get(id);
}
