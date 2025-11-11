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
			<div className="px-4 sm:px-6 md:px-8 lg:px-10 py-4">
				<div className="flex flex-col gap-2 mb-6 max-w-[655px]">
					<h2 className="font-heading font-medium text-2xl leading-loose text-app-black">
						Edit Granting Institution
					</h2>
					<p className="text-muted-foreground-dark leading-tight">
						Update the details of this granting institution
					</p>
				</div>
			</div>
			<div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 md:px-8 lg:px-10 pb-4">
				<div className="max-w-[655px]">
					<GrantingInstitutionForm institution={grantingInstitution} mode="edit" />
				</div>
			</div>
		</div>
	);
}
