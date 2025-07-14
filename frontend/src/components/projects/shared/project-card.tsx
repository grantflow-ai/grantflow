"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppCard, AppCardContent } from "@/components/app";
import { Badge } from "@/components/ui/badge";
import { useNavigationStore } from "@/stores/navigation-store";
import type { API } from "@/types/api-types";
import { routes } from "@/utils/navigation";

export function ProjectCard({ project }: { project: API.ListProjects.Http200.ResponseBody[0] }) {
	const router = useRouter();
	const { navigateToProject } = useNavigationStore();

	type UserRole = "ADMIN" | "MEMBER" | "OWNER";
	const roleColors: Record<UserRole, string> = {
		ADMIN: "bg-secondary/20 text-secondary-foreground hover:bg-secondary/30",
		MEMBER: "bg-accent/20 text-accent-foreground hover:bg-accent/30",
		OWNER: "bg-primary/10 text-primary hover:bg-primary/20",
	};

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		navigateToProject(project.id, project.name);
		router.push(routes.project.detail());
	};

	return (
		<button
			className="block cursor-pointer w-full text-left"
			data-testid={`project-link-${project.id}`}
			onClick={handleClick}
			type="button"
		>
			<AppCard className="hover:bg-muted/50 group overflow-hidden transition-all duration-300 hover:shadow-md">
				<AppCardContent className="p-4">
					<div className="flex items-start justify-between gap-4">
						<div className="grow">
							<h3 className="mb-1 line-clamp-1 text-base font-semibold">{project.name}</h3>
							<p className="text-muted-foreground line-clamp-2 text-sm">{project.description}</p>
						</div>
						<Badge
							className={`${roleColors[project.role]} whitespace-nowrap px-2 py-0.5 text-xs font-medium uppercase transition-colors duration-300`}
							variant="secondary"
						>
							{project.role}
						</Badge>
					</div>
					<div className="mt-2 flex items-center justify-end">
						<ChevronRight className="text-muted-foreground group-hover:text-foreground size-4 transition-all duration-300 group-hover:translate-x-1" />
					</div>
				</AppCardContent>
			</AppCard>
		</button>
	);
}
