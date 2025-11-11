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
		<div className="flex flex-col gap-6 max-w-[655px]" data-testid="admin-edit-content">
			<div className="flex flex-col gap-2">
				<h2 className="font-heading font-medium text-2xl leading-[30px] text-app-black">
					Edit Granting Institution
				</h2>
				<p className="text-sm text-app-gray-700 font-body">Update the details of this granting institution</p>
			</div>

			<GrantingInstitutionForm institution={grantingInstitution} mode="edit" />
		</div>
	);
}
