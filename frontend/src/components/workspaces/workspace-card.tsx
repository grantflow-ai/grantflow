import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PagePath } from "@/enums";
import { API } from "@/types/api-types";

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
			<Card className="hover:bg-muted/50 group overflow-hidden transition-all duration-300 hover:shadow-md">
				<CardContent className="p-4">
					<div className="flex items-start justify-between gap-4">
						<div className="grow">
							<h3 className="mb-1 line-clamp-1 text-base font-semibold">{workspace.name}</h3>
							<p className="text-muted-foreground line-clamp-2 text-sm">{workspace.description}</p>
						</div>
						<Badge
							className={`${roleColors[workspace.role]} whitespace-nowrap px-2 py-0.5 text-xs font-medium uppercase transition-colors duration-300`}
							variant="secondary"
						>
							{workspace.role}
						</Badge>
					</div>
					<div className="mt-2 flex items-center justify-end">
						<ChevronRight className="text-muted-foreground group-hover:text-foreground size-4 transition-all duration-300 group-hover:translate-x-1" />
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
