import Link from "next/link";
import { listGrantingInstitutions } from "@/actions/granting-institutions";
import { getPredefinedTemplate } from "@/actions/predefined-templates";
import { AdminGrantingInstitutionClient } from "@/components/admin/layout/admin-granting-institution-client";
import {
	PREDEFINED_TEMPLATE_FORM_MODE,
	PredefinedTemplateForm,
} from "@/components/admin/predefined-templates/predefined-template-form";
import { Button } from "@/components/ui/button";
import { routes } from "@/utils/navigation";

interface PageProps {
	params: Promise<{ id: string }>;
}

export default async function EditPredefinedTemplatePage({ params }: PageProps) {
	const { id } = await params;
	const [template, institutions] = await Promise.all([getPredefinedTemplate(id), listGrantingInstitutions()]);

	return (
		<AdminGrantingInstitutionClient activeTab="predefined-templates">
			<div className="space-y-6" data-testid="predefined-template-edit-page">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-semibold">Edit predefined template</h2>
						<p className="text-muted-foreground">Update metadata and sections for this catalog entry.</p>
					</div>
					<Link href={routes.admin.grantingInstitutions.predefinedTemplates.detail(template.id)}>
						<Button data-testid="predefined-template-detail-back-button" variant="ghost">
							Back to detail
						</Button>
					</Link>
				</div>
				<PredefinedTemplateForm
					initialTemplate={template}
					institutions={institutions}
					mode={PREDEFINED_TEMPLATE_FORM_MODE.EDIT}
				/>
			</div>
		</AdminGrantingInstitutionClient>
	);
}
