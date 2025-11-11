import { redirect } from "next/navigation";
import { routes } from "@/utils/navigation";

interface GrantingInstitutionEditRedirectPageProps {
	params: Promise<{
		id: string;
	}>;
}

export default function GrantingInstitutionEditRedirectPage(_props: GrantingInstitutionEditRedirectPageProps) {
	// Redirect old UUID-based routes to the new list page
	// User will need to select the institution again from the list
	redirect(routes.admin.grantingInstitutions.list());
}
