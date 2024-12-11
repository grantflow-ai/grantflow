import { Card, CardContent } from "gen/ui/card";
import Link from "next/link";
import { PagePath } from "@/enums";
import { ChevronRight, FileText } from "lucide-react";
import { Badge } from "gen/ui/badge";
import { GrantApplication } from "@/types/api-types";
import { useStore } from "@/store";
import { useMemo } from "react";

export function GrantApplicationCard({
	application,
	workspaceId,
}: {
	application: GrantApplication;
	workspaceId: string;
}) {
	const { grantCfps } = useStore();

	const url = PagePath.APPLICATION_DETAIL.toString()
		.replace(":workspaceId", workspaceId)
		.replace(":applicationId", application.id);

	const cfp = useMemo(() => grantCfps.find((cfp) => cfp.id === application.cfp_id), [grantCfps, application.cfp_id]);

	return (
		<Link href={url} className="block" data-testid={`application-draft-link-${application.id}`}>
			<Card className="group overflow-hidden transition-all duration-300 hover:shadow-md hover:bg-muted/50">
				<CardContent className="p-4">
					<div className="flex items-start justify-between gap-4">
						<div className="flex-grow">
							<h3 className="font-semibold text-base mb-1 line-clamp-1 flex items-center space-x-2">
								<FileText className="h-5 w-5 text-primary" />
								<span>{application.title}</span>
							</h3>
						</div>
						<Badge
							variant="secondary"
							className="bg-secondary/50 text-secondary-foreground px-2 py-0.5 text-xs font-medium uppercase whitespace-nowrap"
						>
							{cfp?.code}
						</Badge>
					</div>
					<div className="flex items-center justify-end mt-2">
						<ChevronRight className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground" />
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
