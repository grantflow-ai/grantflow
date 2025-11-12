"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminGrantingInstitutionLayout } from "@/components/admin/layout/admin-granting-institution-layout";
import { AdminBreadcrumb } from "@/components/admin/shared/admin-breadcrumb";
import { type GrantingInstitutionTab, TAB_LABELS } from "@/constants/admin";
import { useAdminStore } from "@/stores/admin-store";
import { routes } from "@/utils/navigation";
import { AdminFooter } from "../admin-footer";

interface AdminGrantingInstitutionClientProps {
	activeTab: GrantingInstitutionTab;
	children: React.ReactNode;
}

export function AdminGrantingInstitutionClient({ activeTab, children }: AdminGrantingInstitutionClientProps) {
	const router = useRouter();
	const { getGrantingInstitution, grantingInstitution, selectedGrantingInstitutionId } = useAdminStore();

	useEffect(() => {
		if (!selectedGrantingInstitutionId) {
			router.replace(routes.admin.grantingInstitutions.list());
			return;
		}

		void getGrantingInstitution(selectedGrantingInstitutionId);
	}, [selectedGrantingInstitutionId, router, getGrantingInstitution]);

	if (!grantingInstitution) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-preview-bg">
				<div className="text-app-gray-600">Loading...</div>
			</div>
		);
	}

	return (
		<main className="flex flex-col h-screen bg-preview-bg" data-testid="admin-granting-institution-container">
			<header
				className="flex flex-col px-4 sm:px-6 md:px-8 lg:px-10 py-6"
				data-testid="admin-granting-institution-header"
			>
				<AdminBreadcrumb institutionName={grantingInstitution.full_name} tabLabel={TAB_LABELS[activeTab]} />
				<h1 className="font-medium text-[36px] leading-[42px] text-app-black mt-4">
					{grantingInstitution.full_name}
				</h1>
				{grantingInstitution.abbreviation && (
					<p className="text-sm text-app-gray-700 mt-1">{grantingInstitution.abbreviation}</p>
				)}
			</header>

			<div
				className="flex flex-col flex-1 min-h-0 mb-6 mx-4 sm:mx-6 md:mx-8 lg:mx-10 pt-10 rounded-lg border border-app-gray-100 bg-white"
				data-testid="admin-granting-institution-main-content"
			>
				<AdminGrantingInstitutionLayout activeTab={activeTab}>{children}</AdminGrantingInstitutionLayout>
			</div>
			<AdminFooter/>
		</main>
	);
}
