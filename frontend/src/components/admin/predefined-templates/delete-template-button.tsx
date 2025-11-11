"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { deletePredefinedTemplate } from "@/actions/predefined-templates";
import { Button } from "@/components/ui/button";
import { log } from "@/utils/logger/client";
import { routes } from "@/utils/navigation";

interface DeletePredefinedTemplateButtonProps {
	templateId: string;
	variant?: "destructive" | "ghost";
}

export function DeletePredefinedTemplateButton({ templateId, variant = "ghost" }: DeletePredefinedTemplateButtonProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const handleDelete = () => {
		startTransition(async () => {
			try {
				await deletePredefinedTemplate(templateId);
				toast.success("Template deleted");
				router.push(routes.admin.grantingInstitutions.predefinedTemplates.list());
			} catch (error) {
				log.error("Failed to delete predefined template", { error, templateId });
				toast.error("Failed to delete template");
			}
		});
	};

	return (
		<Button
			data-testid="predefined-template-delete"
			disabled={isPending}
			onClick={handleDelete}
			type="button"
			variant={variant}
		>
			{isPending ? "Deleting..." : "Delete"}
		</Button>
	);
}
