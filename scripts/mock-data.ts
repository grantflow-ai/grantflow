import {
	ApplicationDraftFactory,
	ResearchAimFactory,
	ResearchTaskFactory,
	WorkspaceFactory,
} from "::testing/factories";
import type { ApplicationDraft } from "@/types/database-types";
import { createClient } from "@supabase/supabase-js";
import { assertIsNotNullish } from "@tool-belt/type-predicates";
import { config } from "dotenv";
import type { Database } from "gen/database-types";

const dropDateColumns = <T extends { created_at: string; updated_at: string }>(
	obj: T,
): Omit<T, "created_at" | "updated_at" | "deleted_at"> => {
	return Object.fromEntries(
		Object.entries(obj).filter(([key]) => !["created_at", "updated_at", "deleted_at"].includes(key)),
	) as Omit<T, "created_at" | "updated_at" | "deleted_at">;
};

const grantIdentifier = "R01";
const userId = "d5d7b7b3-17e1-4afe-93d5-65b71ba13138";

async function seedDatabase() {
	config();
	const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = process.env;

	assertIsNotNullish(NEXT_PUBLIC_SUPABASE_URL);
	assertIsNotNullish(NEXT_PUBLIC_SUPABASE_ANON_KEY);

	const supabase = createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

	const { data: cfp, error: cfpRetrieveError } = await supabase
		.from("grant_cfps")
		.select(
			`
		*,
		sections:grant_wizard_sections (
			*,
			questions:grant_application_questions (*)
		)`,
		)
		.eq("grant_identifier", grantIdentifier)
		.single();

	if (cfpRetrieveError) {
		throw new Error(`Failed to retrieve CFP: ${cfpRetrieveError.message}`);
	}

	assertIsNotNullish(cfp);

	const { data: workspaces, error: workspaceInsertError } = await supabase
		.from("workspaces")
		.insert(WorkspaceFactory.batch(2).map(dropDateColumns))
		.select("*");

	if (workspaceInsertError) {
		throw new Error(`Failed to insert workspaces: ${workspaceInsertError.message}`);
	}

	for (const workspace of workspaces) {
		const { error: workspaceUserInsertError } = await supabase.from("workspace_users").insert({
			workspace_id: workspace.id,
			user_id: userId,
			role: "owner",
		});

		if (workspaceUserInsertError) {
			throw new Error(`Failed to insert workspace user: ${workspaceUserInsertError.message}`);
		}
	}

	for (const workspace of workspaces) {
		// @ts-expect-error - in-explicit ts error
		const { data: drafts, error: draftInsertError } = await supabase
			.from("application_drafts")
			.insert(
				ApplicationDraftFactory.batch(2, {
					workspace_id: workspace.id,
					cfp_id: cfp.id,
					is_resubmission: false,
				}).map(dropDateColumns),
			)
			.select("*");

		if (draftInsertError) {
			throw new Error(`Failed to insert drafts: ${draftInsertError.message}`);
		}

		assertIsNotNullish(drafts);

		for (const draft of drafts) {
			const { data: researchAims, error: researchAimsInsertError } = await supabase
				.from("research_aims")
				.insert(
					ResearchAimFactory.batch(3, {
						draft_id: (draft as ApplicationDraft).id,
						includes_clinical_trials: true,
					}).map(dropDateColumns),
				)
				.select("*");

			if (researchAimsInsertError) {
				throw new Error(`Failed to insert research aims: ${researchAimsInsertError.message}`);
			}
			assertIsNotNullish(researchAims);

			for (const aim of researchAims) {
				const { data: tasks, error: taskInsertError } = await supabase
					.from("research_tasks")
					.insert(
						ResearchTaskFactory.batch(3)
							.map(dropDateColumns)
							.map((task) => ({ ...task, research_aim_id: aim.id })),
					)
					.select("*");

				if (taskInsertError) {
					throw new Error(`Failed to insert tasks: ${taskInsertError.message}`);
				}
				assertIsNotNullish(tasks);
			}
		}
	}
}
