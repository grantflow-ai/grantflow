import { redirect } from "next/navigation";
import { routes } from "@/utils/navigation";

export default function PredefinedTemplateNewRedirectPage() {
	// Redirect old predefined template new to granting institutions list
	// User will need to select an institution first
	redirect(routes.admin.grantingInstitutions.list());
}
