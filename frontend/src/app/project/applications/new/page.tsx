import { NavigationContextProvider } from "@/providers/navigation-context-provider";
import { routes } from "@/utils/navigation";
import { NewApplicationClient } from "./new-application-client";

export default function NewApplicationPage() {
	return (
		<NavigationContextProvider redirectTo={routes.projects()} requireProject>
			<NewApplicationClient />
		</NavigationContextProvider>
	);
}
