import { redirect } from "next/navigation";
import { routes } from "@/utils/navigation";

interface PredefinedTemplateRedirectPageProps {
	params: Promise<{
		id: string;
	}>;
}

export default function PredefinedTemplateRedirectPage(_props: PredefinedTemplateRedirectPageProps) {
	// Redirect old predefined template detail to granting institutions list
	// User will need to select an institution first
	redirect(routes.admin.grantingInstitutions.list());
}
