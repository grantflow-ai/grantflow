import { AdminGrantingInstitutionSourcesContent } from "@/components/admin/granting-institutions/admin-granting-institution-sources-content";
import { AdminGrantingInstitutionClient } from "@/components/admin/layout/admin-granting-institution-client";

export default function GrantingInstitutionSourcesPage() {
	return (
		<AdminGrantingInstitutionClient activeTab="sources">
			<AdminGrantingInstitutionSourcesContent />
		</AdminGrantingInstitutionClient>
	);
}
