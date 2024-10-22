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
	deleteResearchInnovation,
	deleteResearchSignificance,
	deleteResearchTask,
	upsertGrantApplication,
	upsertResearchAim,
	upsertResearchInnovation,
	upsertResearchSignificance,
	upsertResearchTask,
} from "@/actions/wizard";

type UpdateAction<T, K extends keyof T = keyof T> = (field: K, value: T[K]) => Promise<void>;
type UpdateActionWithId<T, K extends keyof T = keyof T> = (id: string, field: K, value: T[K]) => Promise<void>;

export interface WizardStoreInit {
	application: GrantApplication | null;
	innovation: ResearchInnovation | null;
	researchAims: ResearchAim[];
	researchTasks: ResearchTask[];
	significance: ResearchSignificance | null;
	workspaceId: string;
}

export interface WizardStoreMethods {
	addResearchAim: (aim: NewResearchAim) => Promise<void>;
	addResearchTask: (task: NewResearchTask) => Promise<void>;
	removeResearchAim: (aimId: string) => Promise<void>;
	removeResearchTask: (taskId: string) => Promise<void>;
	updateApplication: UpdateAction<GrantApplication>;
	updateResearchAim: UpdateActionWithId<ResearchAim>;
	updateResearchInnovation: UpdateAction<ResearchInnovation>;
	updateResearchSignificance: UpdateAction<ResearchSignificance>;
	updateResearchTask: UpdateActionWithId<ResearchTask>;
}

export type WizardStore = WizardStoreInit & WizardStoreMethods;

const initialValue: Omit<WizardStoreInit, "workspaceId"> = {
	application: null,
	innovation: null,
	researchAims: [],
	researchTasks: [],
	significance: null,
};

function createWizardStore(
	values: Pick<WizardStoreInit, "workspaceId"> & Partial<WizardStoreInit>,
): (set: StoreApi<WizardStore>["setState"], get: StoreApi<WizardStore>["getState"]) => WizardStore {
	return (set, get) => ({
		...initialValue,
		...values,
		addResearchAim: async (values) => {
			const aim = await upsertResearchAim(values);
			set({ researchAims: [...get().researchAims, aim] });
		},
		addResearchTask: async (values) => {
			const task = await upsertResearchTask(values);
			set({ researchTasks: [...get().researchTasks, task] });
		},
		removeResearchAim: async (aimId) => {
			await deleteResearchAim(aimId);
			set({ researchAims: get().researchAims.filter((aim) => aim.id !== aimId) });
		},
		removeResearchInnovation: async () => {
			const { innovation } = get();
			if (!innovation) return;

			await deleteResearchInnovation(innovation.id);
			set({ innovation: null });
		},
		removeResearchSignificance: async () => {
			const { significance } = get();
			if (!significance) return;

			await deleteResearchSignificance(significance.id);
			set({ significance: null });
		},
		removeResearchTask: async (taskId) => {
			await deleteResearchTask(taskId);
			set({ researchTasks: get().researchTasks.filter((task) => task.id !== taskId) });
		},
		updateApplication: async (field, value) => {
			const { application } = get();
			if (!application) return;

			const updatedApplication = await upsertGrantApplication({
				id: application.id,
				[field]: value,
			});
			set({ application: updatedApplication });
		},
		updateResearchAim: async (aimId, field, value) => {
			const updatedResearchAim = await upsertResearchAim({
				id: aimId,
				[field]: value,
			});
			set({
				researchAims: get().researchAims.map((aim) => (aim.id === aimId ? updatedResearchAim : aim)),
			});
		},
		updateResearchInnovation: async (field, value) => {
			const { innovation } = get();
			if (!innovation) return;

			const updatedInnovation = await upsertResearchInnovation({
				id: innovation.id,
				[field]: value,
			});
			set({ innovation: updatedInnovation });
		},
		updateResearchSignificance: async (field, value) => {
			const { significance } = get();
			if (!significance) return;

			const updatedSignificance = await upsertResearchSignificance({
				id: significance.id,
				[field]: value,
			});
			set({ significance: updatedSignificance });
		},
		updateResearchTask: async (taskId, field, value) => {
			const updatedTask = await upsertResearchTask({
				id: taskId,
				[field]: value,
			});
			set({
				researchTasks: get().researchTasks.map((task) => (task.id === taskId ? updatedTask : task)),
			});
		},
	});
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
