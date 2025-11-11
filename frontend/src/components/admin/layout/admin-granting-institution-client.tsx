"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminGrantingInstitutionLayout } from "@/components/admin/layout/admin-granting-institution-layout";
import { AdminBreadcrumb } from "@/components/admin/shared/admin-breadcrumb";
import { useAdminStore } from "@/stores/admin-store";
import { routes } from "@/utils/navigation";

interface AdminGrantingInstitutionClientProps {
	activeTab: "edit" | "predefined-templates" | "sources";
	children: React.ReactNode;
}

export function AdminGrantingInstitutionClient({ activeTab, children }: AdminGrantingInstitutionClientProps) {
	const router = useRouter();
	const { getGrantingInstitution, grantingInstitution, selectedGrantingInstitutionId } = useAdminStore();

	useEffect(() => {
		if (!selectedGrantingInstitutionId) {
			router.replace(routes.admin.grantingInstitutions.list());
		}
	}, [selectedGrantingInstitutionId, router]);

	useEffect(() => {
		if (selectedGrantingInstitutionId) {
			void getGrantingInstitution(selectedGrantingInstitutionId);
		}
	}, [selectedGrantingInstitutionId, getGrantingInstitution]);

	if (!grantingInstitution) {
		return null;
	}

	const getActiveTabLabel = () => {
		switch (activeTab) {
			case "edit": {
				return "Edit";
			}
			case "predefined-templates": {
				return "Predefined Templates";
			}
			case "sources": {
				return "Sources";
			}
		}
	};

	return (
		<div
			className="relative size-full overflow-y-scroll bg-preview-bg"
			data-testid="admin-granting-institution-container"
		>
			<section className="w-full h-full">
				<main className="w-full h-full flex flex-col">
					<div className="px-10 py-6" data-testid="admin-granting-institution-header">
						<AdminBreadcrumb
							institutionName={grantingInstitution.full_name}
							tabLabel={getActiveTabLabel()}
						/>
						<h1 className="font-medium text-[36px] leading-[42px] text-app-black mt-4">
							{grantingInstitution.full_name}
						</h1>
						{grantingInstitution.abbreviation && (
							<p className="text-sm text-app-gray-700 mt-1">{grantingInstitution.abbreviation}</p>
						)}
					</div>

					<main
						className="scrollbar-hide mb-6 px-10 relative flex flex-col gap-10 py-14 flex-1 overflow-y-auto rounded-lg border border-app-gray-100 min-h-0 bg-white"
						data-testid="admin-granting-institution-main-content"
					>
						<AdminGrantingInstitutionLayout activeTab={activeTab}>
							{children}
						</AdminGrantingInstitutionLayout>
					</main>
				</main>
			</section>
		</div>
	);
}
