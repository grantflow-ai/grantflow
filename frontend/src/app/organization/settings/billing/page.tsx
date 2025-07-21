import { OrganizationSettingsClient } from "@/components/organizations/settings/organization-settings-client";
import { NavigationContextProvider } from "@/providers/navigation-context-provider";
import { routes } from "@/utils/navigation";

export default function OrganizationSettingsBillingPage() {
	return (
		<NavigationContextProvider redirectTo={routes.organization.root()} requireProject>
			<OrganizationSettingsClient activeTab="billing" />
		</NavigationContextProvider>
	);
}
