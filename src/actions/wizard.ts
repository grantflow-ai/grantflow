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

// eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
const dropId = <T extends { id: string }>({ id, ...rest }: T) => rest;

/**
 * Upsert a grant application.
 *
 * @note If passed in values include an id, the db application will be updated, otherwise it will be inserted.
 *
 * @param values - The values to upsert.
 * @returns The upserted grant application.
 */
export async function upsertGrantApplication(
	values: (Pick<GrantApplication, "id"> & Partial<Omit<GrantApplication, "id">>) | NewGrantApplication,
): Promise<GrantApplication> {
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
}

/**
 * Upsert a research aim.
 *
 * @note If passed in values include an id, the db aim will be updated, otherwise it will be inserted.
 *
 * @param values - The values to upsert.
 * @returns The upserted research aim.
 */
export async function upsertResearchAim(
	values: (Pick<ResearchAim, "id"> & Partial<Omit<ResearchAim, "id">>) | NewResearchAim,
): Promise<ResearchAim> {
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
}

/**
 * Upsert a research innovation.
 *
 * @note If passed in values include an id, the db innovation will be updated, otherwise it will be inserted.
 *
 * @param values - The values to upsert.
 * @returns The upserted research innovation.
 */
export async function upsertResearchInnovation(
	values: (Pick<ResearchInnovation, "id"> & Partial<Omit<ResearchInnovation, "id">>) | NewResearchInnovation,
): Promise<ResearchInnovation> {
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
}

/**
 * Upsert a research significance.
 *
 * @note If passed in values include an id, the db significance will be updated, otherwise it will be inserted.
 *
 * @param values - The values to upsert.
 * @returns The upserted research significance.
 */
export async function upsertResearchSignificance(
	values: (Pick<ResearchSignificance, "id"> & Partial<Omit<ResearchSignificance, "id">>) | NewResearchSignificance,
): Promise<ResearchSignificance> {
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
}

/**
 * Upsert a research task.
 *
 * @note If passed in values include an id, the db task will be updated, otherwise it will be inserted.
 *
 * @param values - The values to upsert.
 * @returns The upserted research task.
 */
export async function upsertResearchTask(
	values: (Pick<ResearchTask, "id"> & Partial<Omit<ResearchTask, "id">>) | NewResearchTask,
): Promise<ResearchTask> {
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
}

/**
 * Delete a research aim by ID.
 *
 * @param aimId - The ID of the research aim to delete.
 */
export async function deleteResearchAim(aimId: ResearchAim["id"]): Promise<void> {
	const db = getDatabaseClient();
	await db.delete(researchAims).where(eq(researchAims.id, aimId));
}

/**
 * Delete a research innovation by ID.
 *
 * @param innovationId - The ID of the research innovation to delete.
 */
export async function deleteResearchInnovation(innovationId: ResearchInnovation["id"]): Promise<void> {
	const db = getDatabaseClient();
	await db.delete(researchInnovation).where(eq(researchInnovation.id, innovationId));
}

/**
 * Delete a research significance by ID.
 *
 * @param significanceId - The ID of the research significance to delete.
 */
export async function deleteResearchSignificance(significanceId: ResearchSignificance["id"]): Promise<void> {
	const db = getDatabaseClient();
	await db.delete(researchSignificance).where(eq(researchSignificance.id, significanceId));
}

/**
 * Delete a research task by ID.
 *
 * @param taskId - The ID of the research task to delete.
 */
export async function deleteResearchTask(taskId: ResearchTask["id"]): Promise<void> {
	const db = getDatabaseClient();
	await db.delete(researchTasks).where(eq(researchTasks.id, taskId));
}
