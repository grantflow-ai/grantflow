import Link from "next/link";
import { listGrantingInstitutions } from "@/actions/granting-institutions";
import { getPredefinedTemplate } from "@/actions/predefined-templates";
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
		<div className="container mx-auto space-y-6 py-10" data-testid="predefined-template-edit-page">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Edit predefined template</h1>
					<p className="text-muted-foreground">Update metadata and sections for this catalog entry.</p>
				</div>
				<Link href={routes.admin.predefinedTemplates.detail(template.id)}>
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
	);
}
