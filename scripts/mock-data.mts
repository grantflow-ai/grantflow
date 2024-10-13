import { faker } from "@faker-js/faker";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { assertIsNotNullish } from "@tool-belt/type-predicates";
import { Database } from "gen/database-types";

async function seedDatabase() {
	config();
	const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = process.env;

	assertIsNotNullish(NEXT_PUBLIC_SUPABASE_URL);
	assertIsNotNullish(NEXT_PUBLIC_SUPABASE_ANON_KEY);

	const supabase = createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

	const workspaces = [
		{
			id: faker.string.uuid(),
			name: "Workspace 1",
			logo_url: "https://via.placeholder.com/150?text=Logo+3",
			description: faker.lorem.sentence(),
		},
		{
			id: faker.string.uuid(),
			name: "Workspace 2",
			logo_url: "https://via.placeholder.com/150?text=Logo+3",
			description: faker.lorem.sentence(),
		},
	];

	for (const workspace of workspaces) {
		await supabase.from("workspaces").insert(workspace);
	}

	const userId = "d5d7b7b3-17e1-4afe-93d5-65b71ba13138";
	for (const workspace of workspaces) {
		await supabase.from("workspace_users").insert({
			workspace_id: workspace.id,
			user_id: userId,
			role: "owner",
		});
	}

	const { data: cfps } = await supabase.from("grant_cfps").select("id").limit(1);
	if (!cfps || cfps.length === 0) {
		throw new Error("No grant_cfps available for seeding.");
	}
	const [cfp] = cfps;

	const [workspaceWithDrafts] = workspaces;
	const applicationDrafts = [
		{
			id: faker.string.uuid(),
			workspace_id: workspaceWithDrafts.id,
			cfp_id: cfp.id,
			title: "Application Draft 1",
			is_resubmission: false,
		},
		{
			id: faker.string.uuid(),
			workspace_id: workspaceWithDrafts.id,
			cfp_id: cfp.id,
			title: "Application Draft 2",
			is_resubmission: true,
		},
	];

	for (const draft of applicationDrafts) {
		await supabase.from("application_drafts").insert(draft);
	}

	for (const draft of applicationDrafts) {
		for (let i = 0; i < 3; i++) {
			await supabase.from("research_aims").insert({
				id: faker.string.uuid(),
				draft_id: draft.id,
				title: `Research Aim ${i + 1}`,
				description: faker.lorem.sentence(),
				includes_clinical_trials: faker.datatype.boolean(),
			});
		}
	}

	const { data: researchAims } = await supabase.from("research_aims").select("id, draft_id");
	if (!researchAims) {
		throw new Error("Failed to fetch research aims.");
	}

	for (const aim of researchAims) {
		const numTasks = faker.number.int({ min: 1, max: 3 });
		for (let i = 0; i < numTasks; i++) {
			await supabase.from("research_tasks").insert({
				id: faker.string.uuid(),
				research_aim_id: aim.id,
				title: `Task ${i + 1}`,
				description: faker.lorem.sentence(),
			});
		}
	}

	const { data: questions } = await supabase.from("grant_application_questions").select("id, section_id");
	if (!questions) {
		throw new Error("Failed to fetch questions.");
	}

	const [draftWithFullAnswers, draftWithPartialAnswers] = applicationDrafts;

	for (const question of questions) {
		const value = generateRandomValue();
		await supabase.from("grant_application_answers").insert({
			id: faker.string.uuid(),
			draft_id: draftWithFullAnswers.id,
			question_id: question.id,
			question_type: "per-section",
			value,
		});
	}

	const halfQuestions = questions.slice(0, Math.floor(questions.length / 2));
	for (const question of halfQuestions) {
		const value = generateRandomValue();
		await supabase.from("grant_application_answers").insert({
			id: faker.string.uuid(),
			draft_id: draftWithPartialAnswers.id,
			question_id: question.id,
			question_type: "per-section",
			value,
		});
	}

	// eslint-disable-next-line no-console
	console.log("Seeding completed successfully!");
}

function generateRandomValue() {
	const type = faker.number.int({ min: 1, max: 5 });
	switch (type) {
		case 1: {
			return undefined;
		}
		case 2: {
			return faker.datatype.boolean();
		}
		case 3: {
			return faker.lorem.sentence();
		}
		case 4: {
			return faker.number.int(100);
		}
		case 5: {
			return { from: faker.number.int(50), to: faker.number.int({ min: 50, max: 100 }) };
		}
		default: {
			return undefined;
		}
	}
}

await seedDatabase();
