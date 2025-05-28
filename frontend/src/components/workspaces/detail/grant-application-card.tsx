"use client";
import { ChevronRight, FileText } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PagePath } from "@/enums";
import { API } from "@/types/api-types";

export function GrantApplicationCard({
	application,
	workspaceId,
}: {
	application: API.GetWorkspace.Http200.ResponseBody["grant_applications"][0];
	workspaceId: string;
}) {
	const url = PagePath.APPLICATION_DETAIL.toString()
		.replace(":workspaceId", workspaceId)
		.replace(":applicationId", application.id);

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
						{application.completed_at && (
							<Badge
								className="bg-secondary/50 text-secondary-foreground whitespace-nowrap px-2 py-0.5 text-xs font-medium uppercase"
								variant="secondary"
							>
								{application.completed_at}
							</Badge>
						)}
					</div>
					<div className="mt-2 flex items-center justify-end">
						<ChevronRight className="text-muted-foreground group-hover:text-foreground size-4 transition-all duration-300 group-hover:translate-x-1" />
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
