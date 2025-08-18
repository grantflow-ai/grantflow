import { OrganizationSettingsClient } from "@/components/organizations";
import { NavigationContextProvider } from "@/providers/navigation-context-provider";
import { routes } from "@/utils/navigation";

export default function PersonalSettingsPage() {
	return (
		<NavigationContextProvider redirectTo={routes.organization.root()}>
			<OrganizationSettingsClient activeTab="personal" />
		</NavigationContextProvider>
	);
}
