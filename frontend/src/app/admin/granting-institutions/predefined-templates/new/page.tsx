import Link from "next/link";
import { listGrantingInstitutions } from "@/actions/granting-institutions";
import { AdminGrantingInstitutionClient } from "@/components/admin/layout/admin-granting-institution-client";
import {
	PREDEFINED_TEMPLATE_FORM_MODE,
	PredefinedTemplateForm,
} from "@/components/admin/predefined-templates/predefined-template-form";
import { AppButton } from "@/components/app/buttons/app-button";
import { routes } from "@/utils/navigation";

export default async function NewPredefinedTemplatePage() {
	const institutions = await listGrantingInstitutions();

	return (
		<AdminGrantingInstitutionClient activeTab="templates">
			<div className="flex flex-col h-full" data-testid="predefined-template-new-page">
				<div className="px-4 sm:px-6 md:px-8 lg:px-10 py-4">
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div>
							<h2 className="font-heading text-2xl font-medium text-app-black leading-loose">
								Create Predefined Template
							</h2>
							<p className="text-muted-foreground-dark leading-tight">
								Define a reusable grant template synced with catalog guidelines.
							</p>
						</div>
						<Link href={routes.admin.grantingInstitutions.predefinedTemplates.list()}>
							<AppButton data-testid="predefined-template-back-button" size="sm" variant="secondary">
								Back to templates
							</AppButton>
						</Link>
					</div>
				</div>
				<div className="flex-1 min-h-0 overflow-y-auto pb-4">
					<PredefinedTemplateForm institutions={institutions} mode={PREDEFINED_TEMPLATE_FORM_MODE.CREATE} />
				</div>
			</div>
		</AdminGrantingInstitutionClient>
	);
}
