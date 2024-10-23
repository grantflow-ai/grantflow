import { create, type StoreApi, UseBoundStore } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import {
	GrantApplication,
	NewResearchAim,
	NewResearchTask,
	ResearchAim,
	ResearchInnovation,
	ResearchSignificance,
	ResearchTask,
} from "@/types/database-types";
import {
	deleteResearchAim,
	deleteResearchTask,
	upsertGrantApplication,
	upsertResearchAim,
	upsertResearchInnovation,
	upsertResearchSignificance,
	upsertResearchTask,
} from "@/actions/wizard";
import { isString } from "@tool-belt/type-predicates";
import { toast } from "sonner";

type UpsertAction<T> = (values: Partial<T>) => Promise<void>;
type UpsertActionWithId<T> = (id: string, values: Partial<T>) => Promise<void>;
export interface WizardStoreInit {
	application: GrantApplication | null;
	innovation: ResearchInnovation | null;
	researchAims: ResearchAim[];
	researchTasks: ResearchTask[];
	significance: ResearchSignificance | null;
	workspaceId: string;
	loading: boolean;
}

export interface WizardStoreMethods {
	addResearchAim: (aim: NewResearchAim) => Promise<void>;
	addResearchTask: (task: NewResearchTask) => Promise<void>;
	removeResearchAim: (aimId: string) => Promise<void>;
	removeResearchTask: (taskId: string) => Promise<void>;
	updateApplication: UpsertAction<GrantApplication>;
	updateResearchAim: UpsertActionWithId<ResearchAim>;
	updateResearchInnovation: UpsertAction<ResearchInnovation>;
	updateResearchSignificance: UpsertAction<ResearchSignificance>;
	updateResearchTask: UpsertActionWithId<ResearchTask>;
}

export type WizardStore = WizardStoreInit & WizardStoreMethods;

const initialValue: Omit<WizardStoreInit, "workspaceId"> = {
	loading: false,
	application: null,
	innovation: null,
	researchAims: [],
	researchTasks: [],
	significance: null,
};

function createWizardStore(
	values: Pick<WizardStoreInit, "workspaceId"> & Partial<WizardStoreInit>,
): (set: StoreApi<WizardStore>["setState"], get: StoreApi<WizardStore>["getState"]) => WizardStore {
	return (set, get) => {
		const withLoadingAndErrorHandling = async <T>(
			value: Promise<T | string | null>,
			setter?: ((value: T) => void) | (() => void),
		): Promise<void> => {
			set({ loading: true });
			const result = await value;
			set({ loading: false });
			if (isString(result)) {
				toast.error(result, { duration: 3000 });
				return;
			}
			// @ts-expect-error - unnecessary gymnastics
			setter?.(result);
		};
		return {
			...initialValue,
			...values,
			addResearchAim: async (values) => {
				await withLoadingAndErrorHandling(upsertResearchAim(values), (aim) => {
					set({ researchAims: [...get().researchAims, aim] });
				});
			},
			addResearchTask: async (values) => {
				await withLoadingAndErrorHandling(upsertResearchTask(values), (values) => {
					set({ researchTasks: [...get().researchTasks, values] });
				});
			},
			removeResearchAim: async (aimId) => {
				await withLoadingAndErrorHandling(deleteResearchAim(aimId), () => {
					set({ researchAims: get().researchAims.filter((aim) => aim.id !== aimId) });
				});
			},
			removeResearchTask: async (taskId) => {
				await withLoadingAndErrorHandling(deleteResearchTask(taskId), () => {
					set({ researchTasks: get().researchTasks.filter((task) => task.id !== taskId) });
				});
			},
			updateApplication: async (values) => {
				const { application } = get();
				if (!application) {
					return;
				}

				await withLoadingAndErrorHandling(
					upsertGrantApplication({
						id: application.id,
						...values,
					}),
					(application) => {
						set({ application });
					},
				);
			},
			updateResearchAim: async (aimId, values) => {
				await withLoadingAndErrorHandling(
					upsertResearchAim({
						id: aimId,
						...get().researchAims.find((aim) => aim.id === aimId),
						...values,
					}),
					(updatedAim) => {
						set({
							researchAims: get().researchAims.map((aim) => (aim.id === aimId ? updatedAim : aim)),
						});
					},
				);
			},
			updateResearchInnovation: async (values) => {
				const { innovation } = get();
				if (!innovation) {
					return;
				}

				await withLoadingAndErrorHandling(
					upsertResearchInnovation({
						id: innovation.id,
						...get().innovation,
						...values,
					}),
					(innovation) => {
						set({ innovation });
					},
				);
			},
			updateResearchSignificance: async (values) => {
				const { significance } = get();
				if (!significance) {
					return;
				}

				await withLoadingAndErrorHandling(
					upsertResearchSignificance({
						id: significance.id,
						...get().significance,
						...values,
					}),
					(significance) => {
						set({ significance });
					},
				);
			},
			updateResearchTask: async (taskId, values) => {
				await withLoadingAndErrorHandling(
					upsertResearchTask({
						id: taskId,
						...values,
					}),
					(updatedTask) => {
						set({
							researchTasks: get().researchTasks.map((task) => (task.id === taskId ? updatedTask : task)),
						});
					},
				);
			},
		};
	};
}

const stores = new Map<string, UseBoundStore<StoreApi<WizardStore>>>();

export const useWizardStore = (values: Pick<WizardStoreInit, "workspaceId"> & Partial<WizardStoreInit>) => {
	let store = stores.get(values.workspaceId);
	if (!store) {
		store = create(
			devtools(
				persist((set, get) => createWizardStore(values)(set, get), {
					// TODO: revisit this
					name: `wizard-stores-${values.workspaceId}`,
					storage: createJSONStorage(() => localStorage),
				}),
			),
		);
		stores.set(values.workspaceId, store);
	}
	return store;
};
