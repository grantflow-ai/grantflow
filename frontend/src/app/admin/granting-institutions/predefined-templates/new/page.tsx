import Link from "next/link";
import { listGrantingInstitutions } from "@/actions/granting-institutions";
import { AdminGrantingInstitutionClient } from "@/components/admin/layout/admin-granting-institution-client";
import {
	PREDEFINED_TEMPLATE_FORM_MODE,
	PredefinedTemplateForm,
} from "@/components/admin/predefined-templates/predefined-template-form";
import { Button } from "@/components/ui/button";
import { routes } from "@/utils/navigation";

export default async function NewPredefinedTemplatePage() {
	const institutions = await listGrantingInstitutions();

	return (
		<AdminGrantingInstitutionClient activeTab="predefined-templates">
			<div className="space-y-6" data-testid="predefined-template-new-page">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-semibold">Create predefined template</h2>
						<p className="text-muted-foreground">
							Define a reusable grant template synced with catalog guidelines.
						</p>
					</div>
					<Link href={routes.admin.grantingInstitutions.predefinedTemplates.list()}>
						<Button data-testid="predefined-template-back-button" variant="ghost">
							Back to templates
						</Button>
					</Link>
				</div>
				<PredefinedTemplateForm institutions={institutions} mode={PREDEFINED_TEMPLATE_FORM_MODE.CREATE} />
			</div>
		</AdminGrantingInstitutionClient>
	);
}
