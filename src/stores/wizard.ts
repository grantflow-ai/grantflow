import { create, type StoreApi, UseBoundStore } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import {
	GrantApplication,
	NewGrantApplication,
	NewResearchAim,
	NewResearchInnovation,
	NewResearchSignificance,
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

type UpsertAction<T> = (values: Partial<T>, cb?: () => void) => Promise<void>;
type UpsertActionWithId<T> = (id: string, values: Partial<T>, cb?: () => void) => Promise<void>;

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
	addResearchAim: (aim: NewResearchAim, cb?: () => void) => Promise<void>;
	addResearchTask: (task: NewResearchTask, cb?: () => void) => Promise<void>;
	removeResearchAim: (aimId: string, cb?: () => void) => Promise<void>;
	removeResearchTask: (taskId: string, cb?: () => void) => Promise<void>;
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
			cb?: () => void,
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
			cb?.();
		};
		return {
			...initialValue,
			...values,
			addResearchAim: async (values, cb) => {
				await withLoadingAndErrorHandling(
					upsertResearchAim(values),
					(aim) => {
						set({ researchAims: [...get().researchAims, aim] });
					},
					cb,
				);
			},
			addResearchTask: async (values, cb) => {
				await withLoadingAndErrorHandling(
					upsertResearchTask(values),
					(values) => {
						set({ researchTasks: [...get().researchTasks, values] });
					},
					cb,
				);
			},
			removeResearchAim: async (aimId, cb) => {
				await withLoadingAndErrorHandling(
					deleteResearchAim(aimId),
					() => {
						set({ researchAims: get().researchAims.filter((aim) => aim.id !== aimId) });
					},
					cb,
				);
			},
			removeResearchTask: async (taskId, cb) => {
				await withLoadingAndErrorHandling(
					deleteResearchTask(taskId),
					() => {
						set({ researchTasks: get().researchTasks.filter((task) => task.id !== taskId) });
					},
					cb,
				);
			},
			updateApplication: async (values, cb) => {
				const { application, workspaceId } = get();

				await withLoadingAndErrorHandling(
					upsertGrantApplication({ ...application, ...values, workspaceId } as
						| NewGrantApplication
						| GrantApplication),
					(application) => {
						set({ application });
					},
					cb,
				);
			},
			updateResearchAim: async (aimId, values, cb) => {
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
					cb,
				);
			},
			updateResearchInnovation: async (values, cb) => {
				const { innovation } = get();

				await withLoadingAndErrorHandling(
					upsertResearchInnovation({
						...innovation,
						...values,
					} as NewResearchInnovation | ResearchInnovation),
					(innovation) => {
						set({ innovation });
					},
					cb,
				);
			},
			updateResearchSignificance: async (values, cb) => {
				const { significance } = get();

				await withLoadingAndErrorHandling(
					upsertResearchSignificance({
						...significance,
						...values,
					} as NewResearchSignificance | ResearchSignificance),
					(significance) => {
						set({ significance });
					},
					cb,
				);
			},
			updateResearchTask: async (taskId, values, cb) => {
				await withLoadingAndErrorHandling(
					upsertResearchTask({
						id: taskId,
						...get().researchTasks.find((task) => task.id === taskId),
						...values,
					}),
					(updatedTask) => {
						set({
							researchTasks: get().researchTasks.map((task) => (task.id === taskId ? updatedTask : task)),
						});
					},
					cb,
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
