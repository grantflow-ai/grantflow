import { OrganizationSettingsClient } from "@/components/organizations/settings/organization-settings-client";
import { NavigationContextProvider } from "@/providers/navigation-context-provider";
import { routes } from "@/utils/navigation";

export default function OrganizationSettingsAccountPage() {
	return (
		<NavigationContextProvider redirectTo={routes.organization.root()} requireProject>
			<OrganizationSettingsClient activeTab="account" />
		</NavigationContextProvider>
	);
}
