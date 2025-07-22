import { PersonalSettingsClient } from "@/components/user/settings/personal-settings-client";
import { NavigationContextProvider } from "@/providers/navigation-context-provider";
import { routes } from "@/utils/navigation";

export default function PersonalSettingsPage() {
	return (
		<NavigationContextProvider redirectTo={routes.organization.root()}>
			<PersonalSettingsClient activeTab="profile" />
		</NavigationContextProvider>
	);
}
