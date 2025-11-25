"use client";

import { GrantingInstitutionForm } from "@/components/admin/granting-institutions/granting-institution-form";
import { useAdminStore } from "@/stores/admin-store";

export function AdminGrantingInstitutionEditContent() {
	const { grantingInstitution } = useAdminStore();

	if (!grantingInstitution) {
		return (
			<div className="flex items-center justify-center h-full" data-testid="edit-no-institution">
				<p className="text-app-gray-600">No institution selected</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full" data-testid="admin-edit-content">
			
			<div className="flex-1 min-h-0 overflow-y-auto ">
				<div className="py-6 max-w-[600px] ">
					<GrantingInstitutionForm institution={grantingInstitution} mode="edit" />
				</div>
			</div>
		</div>
	);
}
