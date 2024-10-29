import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
import Link from "next/link";
import { PagePath } from "@/enums";
import { FileText } from "lucide-react";
import { GrantApplication } from "@/types/database-types";
import { Badge } from "gen/ui/badge";

export function GrantApplicationCard({
	id: applicationId,
	title,
	workspaceId,
	isResubmission,
	status,
}: GrantApplication) {
	const url = PagePath.APPLICATION_DETAIL.toString()
		.replace(":workspaceId", workspaceId)
		.replace(":applicationId", applicationId);

	return (
		<Card className="overflow-hidden">
			<Link href={url} className="absolute inset-0 z-10" data-testid={`application-draft-link-${applicationId}`}>
				<span className="sr-only">Navigate to the {title} grant application</span>
			</Link>
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
						{isResubmission && (
							<Badge
								variant="secondary"
								className="bg-accent/50 text-accent-foreground px-2 py-0.5 text-xs font-medium uppercase"
							>
								Resubmission
							</Badge>
						)}
					</div>
				</CardContent>
			</CardHeader>
		</Card>
	);
}
