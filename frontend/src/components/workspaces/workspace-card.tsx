import { PagePath } from "@/enums";
import { API } from "@/types/api-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export function WorkspaceCard({ workspace }: { workspace: API.ListWorkspaces.Http200.ResponseBody[0] }) {
	type UserRole = "ADMIN" | "MEMBER" | "OWNER";
	const roleColors: Record<UserRole, string> = {
		ADMIN: "bg-secondary/20 text-secondary-foreground hover:bg-secondary/30",
		MEMBER: "bg-accent/20 text-accent-foreground hover:bg-accent/30",
		OWNER: "bg-primary/10 text-primary hover:bg-primary/20",
	};

	const url = PagePath.WORKSPACE_DETAIL.toString().replace(":workspaceId", workspace.id);

	return (
		<Link className="block" data-testid={`workspace-link-${workspace.id}`} href={url}>
			<Card className="group overflow-hidden transition-all duration-300 hover:shadow-md hover:bg-muted/50">
				<CardContent className="p-4">
					<div className="flex items-start justify-between gap-4">
						<div className="flex-grow">
							<h3 className="font-semibold text-base mb-1 line-clamp-1">{workspace.name}</h3>
							<p className="text-sm text-muted-foreground line-clamp-2">{workspace.description}</p>
						</div>
						<Badge
							className={`${roleColors[workspace.role]} px-2 py-0.5 text-xs font-medium uppercase transition-colors duration-300 whitespace-nowrap`}
							variant="secondary"
						>
							{workspace.role}
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
