import { getServerClient } from "@/utils/supabase/server";
import { DynamicWizard } from "@/components/wizard/dynamic-forms/dynamic-wizard";
import { serverLogger } from "@/utils/logging/server";

export default async function GrantWizard({ params: { grantIdentifier } }: { params: { grantIdentifier: string } }) {
	const supabase = await getServerClient();

	const { data: cfp, error: cfpError } = await supabase
		.from("grant_cfps")
		.select(`
		*,
		sections:grant_wizard_sections (
			*,
			questions:grant_application_questions (*)
		)
	`)
		.eq("grant_identifier", grantIdentifier)
		.maybeSingle();

	if (!cfp) {
		serverLogger.error("Failed to fetch CFP data", cfpError);
		return null;
	}

	const { data: draft } = await supabase.from("application_drafts").select("*").eq("cfp_id", cfp.id).maybeSingle();

	let draftId = draft?.id;
	if (!draftId) {
		const { data: newDraft, error: newDraftError } = await supabase
			.from("application_drafts")
			.insert({ cfp_id: cfp.id, title: "placeholder" })
			.select("id")
			.single();
		if (!newDraft) {
			serverLogger.error("Failed to create draft", newDraftError);
			return null;
		}
		draftId = newDraft.id;
	}

	const { data: answers, error: answersError } = await supabase
		.from("grant_application_answers")
		.select("*")
		.eq("draft_id", draftId);
	if (!answers) {
		serverLogger.error("Failed to fetch answers", answersError);
		return null;
	}

	const { data: researchAims, error: researchAimsError } = await supabase
		.from("research_aims")
		.select(`
			*,
			tasks:research_tasks (*)
		`)
		.eq("draft_id", draftId);
	if (!researchAims) {
		serverLogger.error("Failed to fetch research aims", researchAimsError);
		return null;
	}

	return (
		<section className="flex justify-center">
			<DynamicWizard cfp={cfp} answers={answers} draftId={draftId} researchAims={researchAims} />
		</section>
	);
}
