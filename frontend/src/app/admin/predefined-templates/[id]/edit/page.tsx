import { redirect } from "next/navigation";
import { routes } from "@/utils/navigation";

interface PredefinedTemplateEditRedirectPageProps {
	params: Promise<{
		id: string;
	}>;
}

export default function PredefinedTemplateEditRedirectPage(_props: PredefinedTemplateEditRedirectPageProps) {
	// Redirect old predefined template edit to granting institutions list
	// User will need to select an institution first
	redirect(routes.admin.grantingInstitutions.list());
}
