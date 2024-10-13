import { PagePath } from "@/enums";
import { getLocale, type SupportedLocale } from "@/i18n";
import { UserRole, Workspace } from "@/types/database-types";
import { handleServerError } from "@/utils/server-side";
import { getServerClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "gen/ui/card";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "gen/ui/avatar";
import { Badge } from "gen/ui/badge";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import { CreateWorkspaceModal } from "@/components/organization/create-workspace-modal";

function WorkspaceCard({ workspace, userRole }: { workspace: Workspace; userRole: UserRole }) {
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
						<AvatarImage src={workspace.logo_url ?? ""} alt={`${workspace.name} logo`} />
						<AvatarFallback>{workspace.name.charAt(0)}</AvatarFallback>
					</Avatar>
					<Badge
						variant="secondary"
						className={`${roleColors[userRole]} px-2 py-0.5 text-xs font-medium uppercase`}
					>
						{userRole}
					</Badge>
				</div>
				<CardTitle className="p-1 line-clamp-1 text-lg font-bold">{workspace.name}</CardTitle>
			</CardHeader>
			<CardContent>
				<CardDescription className="line-clamp-2 text-sm">{workspace.description}</CardDescription>
			</CardContent>
			<ChevronRightIcon className="absolute bottom-4 right-4 h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:right-3 group-hover:text-foreground" />
		</Card>
	);
}

export default async function WorkspacesListPage({
	params: { lang },
}: {
	params: {
		lang: SupportedLocale;
	};
}) {
	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return handleServerError(new Error("Failed to fetch user"), {
			redirect: PagePath.AUTH,
		});
	}

	const client = supabase.from("workspace_users");
	const { data: userWorkspaces, error: userWorkspacesFetchErr } = await client
		.select(
			`
		*,
		workspace:workspaces (*)
		`,
		)
		.eq("user_id", user.id);

	if (userWorkspacesFetchErr) {
		return handleServerError(userWorkspacesFetchErr, {
			message: "Failed to fetch user workspaces",
		});
	}

	const locales = await getLocale(lang);

	return (
		<div className="container mx-auto flex-1 flex-grow overflow-y-auto">
			<div className="p-5">
				<div className="mx-auto w-full flex justify-end w-full">
					<CreateWorkspaceModal locales={locales} />
				</div>
				<div className="my-6 space-y-8">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
						{userWorkspaces.map((userWorkspace) => (
							<WorkspaceCard
								key={userWorkspace.workspace_id}
								workspace={userWorkspace.workspace as Workspace}
								userRole={userWorkspace.role}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
