import Link from "next/link";
import { listPredefinedTemplates } from "@/actions/predefined-templates";
import { PredefinedTemplateList } from "@/components/admin/predefined-templates/predefined-template-list";
import { Button } from "@/components/ui/button";
import { routes } from "@/utils/navigation";

export const dynamic = "force-dynamic";

export default async function PredefinedTemplatesPage() {
	const templates = await listPredefinedTemplates();

	return (
		<div className="container mx-auto space-y-6 py-10" data-testid="predefined-templates-page">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-3xl font-bold">Predefined templates</h1>
					<p className="text-muted-foreground">
						Manage catalog templates that can be cloned into applications.
					</p>
				</div>
				<Link href={routes.admin.predefinedTemplates.new()}>
					<Button data-testid="predefined-template-create-button">Create template</Button>
				</Link>
			</div>
			<PredefinedTemplateList templates={templates} />
		</div>
	);
}
