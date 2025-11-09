"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { deletePredefinedTemplate } from "@/actions/predefined-templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger/client";
import { routes } from "@/utils/navigation";

type TemplateListItem = API.ListPredefinedGrantTemplates.Http200.ResponseBody[number];

const getInstitutionName = (institution: TemplateListItem["granting_institution"]) =>
	(institution as { full_name?: null | string }).full_name ?? "Unassigned";

interface PredefinedTemplateListProps {
	templates: API.ListPredefinedGrantTemplates.Http200.ResponseBody;
}

export function PredefinedTemplateList({ templates }: PredefinedTemplateListProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const handleDelete = (id: string) => {
		startTransition(async () => {
			try {
				await deletePredefinedTemplate(id);
				toast.success("Template deleted");
				router.refresh();
			} catch (error) {
				log.error("Failed to delete predefined template from list", { error, templateId: id });
				toast.error("Failed to delete template");
			}
		});
	};

	if (templates.length === 0) {
		return (
			<Card>
				<CardContent className="py-10 text-center text-sm text-muted-foreground">
					No predefined templates yet. Create one to seed the catalog.
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-3" data-testid="predefined-template-list">
			{templates.map((template) => (
				<Card data-testid={`predefined-template-card-${template.id}`} key={template.id}>
					<CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
						<div>
							<p className="text-base font-semibold">{template.name}</p>
							<p className="text-sm text-muted-foreground">
								{template.activity_code ? `${template.activity_code} · ` : ""}
								{getInstitutionName(template.granting_institution)}
							</p>
							<p className="text-xs text-muted-foreground">
								{template.sections_count} sections · {template.grant_type}
							</p>
						</div>
						<div className="flex gap-2">
							<Link href={routes.admin.predefinedTemplates.detail(template.id)}>
								<Button
									data-testid={`predefined-template-card-view-${template.id}`}
									size="sm"
									variant="secondary"
								>
									View
								</Button>
							</Link>
							<Link href={routes.admin.predefinedTemplates.edit(template.id)}>
								<Button
									data-testid={`predefined-template-card-edit-${template.id}`}
									size="sm"
									variant="outline"
								>
									Edit
								</Button>
							</Link>
							<Button
								data-testid={`predefined-template-card-delete-${template.id}`}
								disabled={isPending}
								onClick={() => {
									handleDelete(template.id);
								}}
								size="sm"
								type="button"
								variant="destructive"
							>
								Delete
							</Button>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
