import { AdminGrantingInstitutionClient } from "@/components/admin/layout/admin-granting-institution-client";
import { AdminPredefinedTemplatesContent } from "@/components/admin/predefined-templates/admin-predefined-templates-content";

export default function PredefinedTemplatesPage() {
	return (
		<AdminGrantingInstitutionClient activeTab="predefined-templates">
			<AdminPredefinedTemplatesContent />
		</AdminGrantingInstitutionClient>
	);
}
