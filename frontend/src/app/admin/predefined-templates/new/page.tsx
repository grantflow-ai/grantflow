import Link from "next/link";
import { listGrantingInstitutions } from "@/actions/granting-institutions";
import {
	PREDEFINED_TEMPLATE_FORM_MODE,
	PredefinedTemplateForm,
} from "@/components/admin/predefined-templates/predefined-template-form";
import { Button } from "@/components/ui/button";
import { routes } from "@/utils/navigation";

export default async function NewPredefinedTemplatePage() {
	const institutions = await listGrantingInstitutions();

	return (
		<div className="container mx-auto space-y-6 py-10" data-testid="predefined-template-new-page">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Create predefined template</h1>
					<p className="text-muted-foreground">
						Define a reusable grant template synced with catalog guidelines.
					</p>
				</div>
				<Link href={routes.admin.predefinedTemplates.list()}>
					<Button data-testid="predefined-template-back-button" variant="ghost">
						Back to templates
					</Button>
				</Link>
			</div>
			<PredefinedTemplateForm institutions={institutions} mode={PREDEFINED_TEMPLATE_FORM_MODE.CREATE} />
		</div>
	);
}
