import { ApplicationWizardPageClient } from "@/components/applications/wizard/application-wizard-page-client";
import { NavigationContextProvider } from "@/providers/navigation-context-provider";
import { routes } from "@/utils/navigation";

export default function ApplicationWizardPage() {
	return (
		<NavigationContextProvider redirectTo={routes.organization.root()} requireApplication requireProject>
			<ApplicationWizardPageClient />
		</NavigationContextProvider>
	);
}
