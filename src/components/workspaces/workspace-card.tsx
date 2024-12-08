import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "gen/ui/card";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "gen/ui/avatar";
import { Badge } from "gen/ui/badge";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import { PagePath } from "@/enums";
import { UserRole } from "@/constants";
import { Workspace } from "@/types/api-types";

export function WorkspaceCard({ workspace }: { workspace: Workspace }) {
	const roleColors: Record<UserRole, string> = {
		[UserRole.Owner]: "bg-primary/20 text-primary",
		[UserRole.Admin]: "bg-secondary/50 text-secondary-foreground",
		[UserRole.Member]: "bg-accent/50 text-accent-foreground",
	};

	const url = PagePath.WORKSPACE_DETAIL.toString().replace(":workspaceId", workspace.id);

	return (
		<Link href={url} className="block" data-testid={`workspace-link-${workspace.id}`}>
			<Card className="group h-[200px] overflow-hidden transition-all duration-300 hover:shadow-md hover:bg-muted/50">
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<Avatar className="h-10 w-10">
							<AvatarImage src={workspace.logo_url ?? ""} alt={`${workspace.name} logo`} />
							<AvatarFallback>{workspace.name.charAt(0)}</AvatarFallback>
						</Avatar>
						<Badge
							variant="secondary"
							className={`${roleColors[workspace.role]} px-2 py-0.5 text-xs font-medium uppercase`}
						>
							{workspace.role}
						</Badge>
					</div>
					<CardTitle className="py-1 line-clamp-1 text-lg font-bold">{workspace.name}</CardTitle>
				</CardHeader>
				<CardContent>
					<CardDescription className="line-clamp-2 text-sm">{workspace.description}</CardDescription>
				</CardContent>
				<ChevronRightIcon className="absolute bottom-4 right-4 h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:right-3 group-hover:text-foreground" />
			</Card>
		</Link>
	);
}
