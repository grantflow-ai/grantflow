"use server";

import { eq } from "drizzle-orm";
import { getDatabaseClient } from "db/connection";
import { grantApplications, researchAims, researchInnovation, researchSignificance, researchTasks } from "db/schema";
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
import { handleServerError } from "@/utils/server-side";

// eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
const dropId = <T extends { id: string }>({ id, ...rest }: T) => rest;

/**
 * Upsert a grant application.
 *
 * @note If passed in values include an id, the db application will be updated, otherwise it will be inserted.
 *
 * @param values - The values to upsert.
 * @returns The upserted grant application or string error message or null.
 */
export async function upsertGrantApplication(
	values: NewGrantApplication | GrantApplication,
): Promise<GrantApplication | string | null> {
	try {
		const db = getDatabaseClient();

		const [application] = await db
			.insert(grantApplications)
			.values(values as NewGrantApplication)
			.onConflictDoUpdate({
				target: researchAims.id,
				set: dropId(values as GrantApplication),
			})
			.returning();

		return application;
	} catch (error) {
		return handleServerError(error as Error, {
			message: "Failed to upsert grant application",
			returnValue: "Unable to save grant application",
		});
	}
}

/**
 * Upsert a research aim.
 *
 * @note If passed in values include an id, the db aim will be updated, otherwise it will be inserted.
 *
 * @param values - The values to upsert.
 * @returns The upserted research aim or string error message or null.
 */
export async function upsertResearchAim(
	values: (Pick<ResearchAim, "id"> & Partial<Omit<ResearchAim, "id">>) | NewResearchAim,
): Promise<ResearchAim | string | null> {
	try {
		const db = getDatabaseClient();

		const [aim] = await db
			.insert(researchAims)
			.values(values as NewResearchAim)
			.onConflictDoUpdate({
				target: researchAims.id,
				set: dropId(values as ResearchAim),
			})
			.returning();

		return aim;
	} catch (error) {
		return handleServerError(error as Error, {
			message: "Failed to upsert research aim",
			returnValue: "Unable to save research aim",
		});
	}
}

/**
 * Upsert a research innovation.
 *
 * @note If passed in values include an id, the db innovation will be updated, otherwise it will be inserted.
 *
 * @param values - The values to upsert.
 * @returns The upserted research innovation or string error message or null.
 */
export async function upsertResearchInnovation(
	values: (Pick<ResearchInnovation, "id"> & Partial<Omit<ResearchInnovation, "id">>) | NewResearchInnovation,
): Promise<ResearchInnovation | string | null> {
	try {
		const db = getDatabaseClient();

		const [innovation] = await db
			.insert(researchInnovation)
			.values(values as NewResearchInnovation)
			.onConflictDoUpdate({
				target: researchInnovation.id,
				set: dropId(values as ResearchInnovation),
			})
			.returning();

		return innovation;
	} catch (error) {
		return handleServerError(error as Error, {
			message: "Failed to upsert research innovation",
			returnValue: "Unable to save research innovation",
		});
	}
}

/**
 * Upsert a research significance.
 *
 * @note If passed in values include an id, the db significance will be updated, otherwise it will be inserted.
 *
 * @param values - The values to upsert.
 * @returns The upserted research significance or string error message or null.
 */
export async function upsertResearchSignificance(
	values: (Pick<ResearchSignificance, "id"> & Partial<Omit<ResearchSignificance, "id">>) | NewResearchSignificance,
): Promise<ResearchSignificance | string | null> {
	try {
		const db = getDatabaseClient();

		const [significance] = await db
			.insert(researchSignificance)
			.values(values as NewResearchSignificance)
			.onConflictDoUpdate({
				target: researchSignificance.id,
				set: dropId(values as ResearchSignificance),
			})
			.returning();

		return significance;
	} catch (error) {
		return handleServerError(error as Error, {
			message: "Failed to upsert research significance",
			returnValue: "Unable to save research significance",
		});
	}
}

/**
 * Upsert a research task.
 *
 * @note If passed in values include an id, the db task will be updated, otherwise it will be inserted.
 *
 * @param values - The values to upsert.
 * @returns The upserted research task or string error message or null.
 */
export async function upsertResearchTask(
	values: (Pick<ResearchTask, "id"> & Partial<Omit<ResearchTask, "id">>) | NewResearchTask,
): Promise<ResearchTask | string | null> {
	try {
		const db = getDatabaseClient();

		const [task] = await db
			.insert(researchTasks)
			.values(values as NewResearchTask)
			.onConflictDoUpdate({
				target: researchTasks.id,
				set: dropId(values as ResearchTask),
			})
			.returning();

		return task;
	} catch (error) {
		return handleServerError(error as Error, {
			message: "Failed to upsert research task",
			returnValue: "Unable to save research task",
		});
	}
}

/**
 * Delete a research aim by ID.
 *
 * @param aimId - The ID of the research aim to delete.
 * @returns void or string error message or null.
 */
export async function deleteResearchAim(aimId: ResearchAim["id"]): Promise<string | null> {
	try {
		const db = getDatabaseClient();
		await db.delete(researchAims).where(eq(researchAims.id, aimId));
		return null;
	} catch (error) {
		return handleServerError(error as Error, {
			message: "Failed to delete research aim",
			returnValue: "Unable to delete research aim",
		});
	}
}

/**
 * Delete a research task by ID.
 *
 * @param taskId - The ID of the research task to delete.
 * @returns void or string error message or null.
 */
export async function deleteResearchTask(taskId: ResearchTask["id"]): Promise<string | null> {
	try {
		const db = getDatabaseClient();
		await db.delete(researchTasks).where(eq(researchTasks.id, taskId));
		return null;
	} catch (error) {
		return handleServerError(error as Error, {
			message: "Failed to delete research task",
			returnValue: "Unable to delete research task",
		});
	}
}
