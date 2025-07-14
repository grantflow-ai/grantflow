import { ProjectSettingsClient } from "@/components/projects/settings/project-settings-client";
import { NavigationContextProvider } from "@/providers/navigation-context-provider";
import { routes } from "@/utils/navigation";

export default function ProjectSettingsNotificationsPage() {
	return (
		<NavigationContextProvider redirectTo={routes.projects()} requireProject>
			<ProjectSettingsClient activeTab="notifications" />
		</NavigationContextProvider>
	);
}
