import { OrganizationSettingsClient } from "@/components/organizations/settings/organization-settings-client";
import { NavigationContextProvider } from "@/providers/navigation-context-provider";
import { routes } from "@/utils/navigation";

export default function OrganizationSettingsMembersPage() {
	return (
		<NavigationContextProvider redirectTo={routes.projects()} requireProject>
			<OrganizationSettingsClient activeTab="members" />
		</NavigationContextProvider>
	);
}
