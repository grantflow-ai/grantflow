import { ProjectDetailClient } from "@/components/organizations/project/project-detail-client";
import { NavigationContextProvider } from "@/providers/navigation-context-provider";
import { routes } from "@/utils/navigation";

export default function ProjectDetailPage() {
	return (
		<NavigationContextProvider redirectTo={routes.organization.root()} requireProject>
			<ProjectDetailClient />
		</NavigationContextProvider>
	);
}
