import { create, type StoreApi, UseBoundStore } from "zustand";
import {
	ApplicationFile,
	GrantApplication,
	GrantCFP,
	NewApplicationFile,
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
	upsertApplicationFiles,
	upsertGrantApplication,
	upsertResearchAim,
	upsertResearchInnovation,
	upsertResearchSignificance,
	upsertResearchTask,
} from "@/actions/db";
import { isString } from "@tool-belt/type-predicates";
import { toast } from "sonner";

type UpsertAction<V, T> = (values: V, cb?: () => void) => Promise<T | null>;

export interface WizardStoreInit {
	application: GrantApplication | null;
	innovation: ResearchInnovation | null;
	researchAims: ResearchAim[];
	researchTasks: ResearchTask[];
	significance: ResearchSignificance | null;
	files: ApplicationFile[];
	cfp: GrantCFP | null;
	workspaceId: string;
	loading: boolean;
}

export interface WizardStoreMethods {
	deleteResearchAim: (aimId: string, cb?: () => void) => Promise<string | null>;
	deleteResearchTask: (taskId: string, cb?: () => void) => Promise<string | null>;
	updateApplication: UpsertAction<NewGrantApplication | GrantApplication, GrantApplication>;
	updateResearchAim: UpsertAction<NewResearchAim | ResearchAim, ResearchAim>;
	updateResearchInnovation: UpsertAction<NewResearchInnovation | ResearchInnovation, ResearchInnovation>;
	updateResearchSignificance: UpsertAction<NewResearchSignificance | ResearchSignificance, ResearchSignificance>;
	updateResearchTask: UpsertAction<NewResearchTask | ResearchTask, ResearchTask>;
	updateFiles: UpsertAction<(NewApplicationFile | ApplicationFile)[], ApplicationFile[]>;
	setGrantCFP: (cfp: GrantCFP) => void;
}

export type WizardStore = WizardStoreInit & WizardStoreMethods;

const initialValue: Omit<WizardStoreInit, "workspaceId"> = {
	application: null,
	cfp: null,
	innovation: null,
	loading: false,
	researchAims: [],
	researchTasks: [],
	significance: null,
	files: [],
};

function createWizardStore(
	values: Pick<WizardStoreInit, "workspaceId"> & Partial<WizardStoreInit>,
): (set: StoreApi<WizardStore>["setState"], get: StoreApi<WizardStore>["getState"]) => WizardStore {
	return (set, get) => {
		const withLoadingAndErrorHandling = async <T>(
			value: Promise<T | string | null>,
			setter?: ((value: T) => void) | (() => void),
			cb?: () => void,
		): Promise<T | null> => {
			set({ loading: true });
			const result = await value;
			set({ loading: false });

			if (isString(result)) {
				toast.error(result, { duration: 3000 });
				return null;
			}

			// @ts-expect-error - unnecessary gymnastics
			setter?.(result);
			cb?.();
			return result;
		};

		return {
			...initialValue,
			...values,
			deleteResearchAim: async (aimId, cb) => {
				return await withLoadingAndErrorHandling(
					deleteResearchAim(aimId),
					() => {
						set({ researchAims: get().researchAims.filter((aim) => aim.id !== aimId) });
					},
					cb,
				);
			},
			deleteResearchTask: async (taskId, cb) => {
				return await withLoadingAndErrorHandling(
					deleteResearchTask(taskId),
					() => {
						set({ researchTasks: get().researchTasks.filter((task) => task.id !== taskId) });
					},
					cb,
				);
			},
			updateApplication: async (values, cb) => {
				const { application, workspaceId } = get();

				return await withLoadingAndErrorHandling(
					upsertGrantApplication({ ...application, ...values, workspaceId } as
						| NewGrantApplication
						| GrantApplication),
					(application) => {
						set({ application });
					},
					cb,
				);
			},
			updateResearchAim: async (values, cb) => {
				const existingResearchAim = values.id
					? get().researchAims.find((aim) => aim.id === values.id)
					: undefined;
				return await withLoadingAndErrorHandling(
					upsertResearchAim({
						...existingResearchAim,
						...values,
					} as NewResearchAim | ResearchAim),
					(updatedAim) => {
						set({
							researchAims: get().researchAims.map((aim) =>
								aim.id === updatedAim.id ? updatedAim : aim,
							),
						});
					},
					cb,
				);
			},
			updateResearchInnovation: async (values, cb) => {
				const { innovation } = get();

				return await withLoadingAndErrorHandling(
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

				return await withLoadingAndErrorHandling(
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
			updateResearchTask: async (values, cb) => {
				const existingResearchTask = values.id
					? get().researchTasks.find((task) => task.id === values.id)
					: undefined;
				return await withLoadingAndErrorHandling(
					upsertResearchTask({
						...existingResearchTask,
						...values,
					} as NewResearchTask | ResearchTask),
					(updatedTask) => {
						set({
							researchTasks: get().researchTasks.map((task) =>
								task.id === updatedTask.id ? updatedTask : task,
							),
						});
					},
					cb,
				);
			},
			updateFiles: async (values, cb) => {
				const sectionName = values.length ? values[0].section : "";
				if (!sectionName) {
					return null;
				}

				const existingFiles = get().files.filter(
					(file) => file.section === sectionName && !values.some((value) => value.id === file.id),
				);
				return await withLoadingAndErrorHandling(
					upsertApplicationFiles([...values, ...existingFiles] as (NewApplicationFile | ApplicationFile)[]),
					(files) => {
						set({ files });
					},
					cb,
				);
			},
			setGrantCFP: (cfp) => {
				set({ cfp });
			},
		};
	};
}

const stores = new Map<string, UseBoundStore<StoreApi<WizardStore>>>();

export const useWizardStore = (values: Pick<WizardStoreInit, "workspaceId"> & Partial<WizardStoreInit>) => {
	let store = stores.get(values.workspaceId);
	if (!store) {
		store = create((set, get) => createWizardStore(values)(set, get));
		stores.set(values.workspaceId, store);
	}
	return store;
};
