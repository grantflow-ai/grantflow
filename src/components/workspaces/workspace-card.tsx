import { UserRole, Workspace } from "@/types/database-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "gen/ui/card";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "gen/ui/avatar";
import { Badge } from "gen/ui/badge";
import { ChevronRightIcon } from "@radix-ui/react-icons";

export function WorkspaceCard({ workspace, userRole }: { workspace: Workspace; userRole: UserRole }) {
	const roleColors: Record<UserRole, string> = {
		owner: "bg-primary/20 text-primary",
		admin: "bg-secondary/50 text-secondary-foreground",
		member: "bg-accent/50 text-accent-foreground",
	};

	return (
		<Card className="group relative h-[200px] overflow-hidden transition-all duration-300 hover:shadow-md hover:bg-muted/50">
			<Link
				href={`/workspaces/${workspace.id}`}
				className="absolute inset-0 z-10"
				data-testid={`workspace-link-${workspace.id}`}
			>
				<span className="sr-only">Navigate to {workspace.name} workspace</span>
			</Link>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<Avatar className="h-10 w-10">
						<AvatarImage src={workspace.logoUrl ?? ""} alt={`${workspace.name} logo`} />
						<AvatarFallback>{workspace.name.charAt(0)}</AvatarFallback>
					</Avatar>
					<Badge
						variant="secondary"
						className={`${roleColors[userRole]} px-2 py-0.5 text-xs font-medium uppercase`}
					>
						{userRole}
					</Badge>
				</div>
				<CardTitle className="py-1 line-clamp-1 text-lg font-bold">{workspace.name}</CardTitle>
			</CardHeader>
			<CardContent>
				<CardDescription className="line-clamp-2 text-sm">{workspace.description}</CardDescription>
			</CardContent>
			<ChevronRightIcon className="absolute bottom-4 right-4 h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:right-3 group-hover:text-foreground" />
		</Card>
	);
}
