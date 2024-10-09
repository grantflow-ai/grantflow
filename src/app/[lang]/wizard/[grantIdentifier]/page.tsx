import { getServerClient } from "@/utils/supabase/server";
import { DynamicWizard } from "@/components/wizard/dynamic-forms/dynamic-wizard";
import { serverLogger } from "@/utils/logging/server";

export default async function GrantWizard({ params: { grantIdentifier } }: { params: { grantIdentifier: string } }) {
	const supabase = await getServerClient();

	const { data, error } = await supabase
		.from("grant_cfps")
		.select(`
		*,
		sections:grant_wizard_sections (
			*,
			questions:grant_application_questions (*)
		)
	`)
		.eq("grant_identifier", grantIdentifier)
		.single();

	if (!data) {
		serverLogger.error("Failed to fetch CFP data", error);
		return null;
	}

	return (
		<section className="flex justify-center">
			<DynamicWizard cfp={data} />
		</section>
	);
}
