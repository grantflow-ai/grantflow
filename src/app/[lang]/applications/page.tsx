import { getServerClient } from "@/utils/supabase/server";
import { handleServerError } from "@/utils/server-side";
import { CFPCombobox } from "@/components/applications/cfp-combobox";

export default async function ApplicationCreateView({
	searchParams: { workspaceId },
}: {
	searchParams: {
		workspaceId: string;
	};
}) {
	const supabase = await getServerClient();
	const { data: cfps, error: fundingOrganizationsRetrieveError } = await supabase
		.from("grant_cfps")
		.select("*")
		.in("code", [
			"R01",
			"R03",
			"R18",
			"R21",
			"R24",
			"R25",
			"R33",
			"R34",
			"R35",
			"R41",
			"R42",
			"R43",
			"R44",
			"R50",
			"R61",
		]);

	if (fundingOrganizationsRetrieveError) {
		return handleServerError(fundingOrganizationsRetrieveError, {
			message: "Failed to fetch funding organizations",
		});
	}

	return (
		<div>
			<h1>Application Create</h1>
			<CFPCombobox cfps={cfps} />
		</div>
	);
}
