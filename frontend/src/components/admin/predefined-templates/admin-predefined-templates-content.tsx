"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listPredefinedTemplates } from "@/actions/predefined-templates";
import { PredefinedTemplateList } from "@/components/admin/predefined-templates/predefined-template-list";
import { AppButton } from "@/components/app/buttons/app-button";
import { useAdminStore } from "@/stores/admin-store";
import type { API } from "@/types/api-types";
import { routes } from "@/utils/navigation";

export function AdminPredefinedTemplatesContent() {
	const { selectedGrantingInstitutionId } = useAdminStore();
	const [templates, setTemplates] = useState<API.ListGrantingInstitutionPredefinedTemplates.Http200.ResponseBody>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchTemplates = async () => {
			if (!selectedGrantingInstitutionId) return;

			setIsLoading(true);
			try {
				const result = await listPredefinedTemplates({
					grantingInstitutionId: selectedGrantingInstitutionId,
				});
				setTemplates(result);
			} finally {
				setIsLoading(false);
			}
		};

		void fetchTemplates();
	}, [selectedGrantingInstitutionId]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full" data-testid="templates-loading">
				<div className="flex flex-col items-center gap-4">
					<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
					<p className="text-app-gray-600">Loading templates...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full" data-testid="predefined-templates-content">
			<div className="px-4 sm:px-6 md:px-8 lg:px-10 py-4">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
					<div>
						<h2 className="font-heading text-2xl font-medium text-app-black leading-loose">
							Predefined Templates
						</h2>
						<p className="text-muted-foreground-dark leading-tight">
							Manage catalog templates that can be cloned into applications.
						</p>
					</div>
					<Link href={routes.admin.grantingInstitutions.predefinedTemplates.new()}>
						<AppButton data-testid="predefined-template-create-button" size="lg">
							Create template
						</AppButton>
					</Link>
				</div>
			</div>
			<div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 md:px-8 lg:px-10 pb-4">
				<PredefinedTemplateList templates={templates} />
			</div>
		</div>
	);
}
