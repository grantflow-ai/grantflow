import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
import Link from "next/link";
import { PagePath } from "@/enums";
import { FileText } from "lucide-react";
import { GrantApplication } from "@/types/database-types";
import { Badge } from "gen/ui/badge";

export function GrantApplicationCard({ id: applicationId, title, workspaceId, status }: GrantApplication) {
	const url = PagePath.APPLICATION_DETAIL.toString()
		.replace(":workspaceId", workspaceId)
		.replace(":applicationId", applicationId);

	return (
		<Link href={url} className="block" data-testid={`application-draft-link-${applicationId}`}>
			<Card className="overflow-hidden transition-shadow hover:shadow-md">
				<CardHeader className="space-y-1">
					<CardTitle className="text-2xl font-semibold flex items-center space-x-2">
						<FileText className="h-6 w-6 text-primary" />
						<span>{title}</span>
					</CardTitle>
					<CardContent>
						<div className="pt-4 flex gap-2">
							<Badge
								variant="secondary"
								className={`${status === "completed" ? "bg-primary/20 text-primary" : "bg-secondary/50 text-secondary-foreground"} px-2 py-0.5 text-xs font-medium uppercase`}
							>
								{status}
							</Badge>
						</div>
					</CardContent>
				</CardHeader>
			</Card>
		</Link>
	);
}
