import { ProjectSettingsClient } from "@/components/projects/settings/project-settings-client";
import { NavigationContextProvider } from "@/providers/navigation-context-provider";
import { routes } from "@/utils/navigation";

export default function ProjectSettingsAccountPage() {
	return (
		<NavigationContextProvider redirectTo={routes.projects()} requireProject>
			<ProjectSettingsClient activeTab="account" />
		</NavigationContextProvider>
	);
}
