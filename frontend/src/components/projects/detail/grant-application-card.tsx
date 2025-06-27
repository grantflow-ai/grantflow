"use client";
import { ChevronRight, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { deleteApplication } from "@/actions/grant-applications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PagePath } from "@/enums";

import type { API } from "@/types/api-types";

export function GrantApplicationCard({
	application,
	projectId,
}: {
	application: API.GetProject.Http200.ResponseBody["grant_applications"][0];
	projectId: string;
}) {
	const router = useRouter();
	const [isDeleting, setIsDeleting] = useState(false);

	const url = application.completed_at
		? PagePath.APPLICATION_DETAIL.toString()
				.replace(":projectId", projectId)
				.replace(":applicationId", application.id)
		: `/projects/${projectId}/applications/${application.id}/wizard`;

	const handleDelete = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (!confirm("Are you sure you want to delete this application?")) {
			return;
		}

		setIsDeleting(true);
		try {
			await deleteApplication(projectId, application.id);
			toast.success("Application deleted successfully");
			router.refresh();
		} catch {
			toast.error("Failed to delete application");
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<Link className="block" data-testid={`application-draft-link-${application.id}`} href={url}>
			<Card className="hover:bg-muted/50 group overflow-hidden transition-all duration-300 hover:shadow-md">
				<CardContent className="p-4">
					<div className="flex items-start justify-between gap-4">
						<div className="grow">
							<h3 className="mb-1 line-clamp-1 flex items-center space-x-2 text-base font-semibold">
								<FileText className="text-primary size-5" />
								<span>{application.title}</span>
							</h3>
						</div>
						<div className="flex items-center gap-2">
							{application.completed_at && (
								<Badge
									className="bg-secondary/50 text-secondary-foreground whitespace-nowrap px-2 py-0.5 text-xs font-medium uppercase"
									variant="secondary"
								>
									{application.completed_at}
								</Badge>
							)}
							<Button
								className="opacity-0 transition-opacity group-hover:opacity-100"
								disabled={isDeleting}
								onClick={handleDelete}
								size="sm"
								variant="ghost"
							>
								<Trash2 className="text-destructive size-4" />
							</Button>
						</div>
					</div>
					<div className="mt-2 flex items-center justify-end">
						<ChevronRight className="text-muted-foreground group-hover:text-foreground size-4 transition-all duration-300 group-hover:translate-x-1" />
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
