import { AdminGrantingInstitutionEditContent } from "@/components/admin/granting-institutions/admin-granting-institution-edit-content";
import { AdminGrantingInstitutionClient } from "@/components/admin/layout/admin-granting-institution-client";

export default function GrantingInstitutionEditPage() {
	return (
		<AdminGrantingInstitutionClient activeTab="edit">
			<AdminGrantingInstitutionEditContent />
		</AdminGrantingInstitutionClient>
	);
}
