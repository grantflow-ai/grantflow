"use server";

import { ProjectSettingsClient } from "@/components/projects/settings/project-settings-client";
import { NavigationContextProvider } from "@/providers/navigation-context-provider";
import { routes } from "@/utils/navigation";

export default function ProjectSettingsBillingPage() {
	return (
		<NavigationContextProvider redirectTo={routes.projects()} requireProject>
			<ProjectSettingsClient activeTab="billing" />
		</NavigationContextProvider>
	);
}
