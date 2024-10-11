import { GrantApplicationWizard } from "@/components/wizard/dynamic-forms/grant-application-wizard";
import { handleServerError } from "@/utils/server-side";
import { getServerClient } from "@/utils/supabase/server";

export default async function GrantWizard({ params: { grantIdentifier } }: { params: { grantIdentifier: string } }) {
	const supabase = await getServerClient();

	const { data: cfp, error: cfpError } = await supabase
		.from("grant_cfps")
		.select(
			`
		*,
		sections:grant_wizard_sections (
			*,
			questions:grant_application_questions (*)
		)
	`,
		)
		.eq("grant_identifier", grantIdentifier)
		.single();

	if (cfpError) {
		return handleServerError(cfpError, { message: "Failed to fetch CFP" });
	}

	const { data: draft } = await supabase.from("application_drafts").select("*").eq("cfp_id", cfp.id).maybeSingle();

	let draftId = draft?.id;
	if (!draftId) {
		const { data: newDraft, error: newDraftError } = await supabase
			.from("application_drafts")
			.insert({ cfp_id: cfp.id, title: "placeholder" })
			.select("id")
			.single();

		if (newDraftError) {
			return handleServerError(newDraftError, {
				message: "Failed to create draft",
			});
		}
		draftId = newDraft.id;
	}

	const { data: answers, error: answersError } = await supabase
		.from("grant_application_answers")
		.select("*")
		.eq("draft_id", draftId);

	if (answersError) {
		return handleServerError(answersError, {
			message: "Failed to fetch answers",
		});
	}

	const { data: researchAims, error: researchAimsError } = await supabase
		.from("research_aims")
		.select(
			`
			*,
			tasks:research_tasks (*)
		`,
		)
		.eq("draft_id", draftId);

	if (researchAimsError) {
		return handleServerError(researchAimsError, {
			message: "Failed to fetch research aims",
		});
	}

	return (
		<section className="flex justify-center">
			<GrantApplicationWizard cfp={cfp} answers={answers} draftId={draftId} researchAims={researchAims} />
		</section>
	);
}
