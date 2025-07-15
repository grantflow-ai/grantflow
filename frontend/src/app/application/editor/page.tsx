import { ApplicationEditorPageClient } from "@/components/applications/editor/application-editor-page-client";
import { NavigationContextProvider } from "@/providers/navigation-context-provider";
import { routes } from "@/utils/navigation";

export default function ApplicationEditorPage() {
	return (
		<NavigationContextProvider redirectTo={routes.projects()} requireApplication requireProject>
			<ApplicationEditorPageClient />
		</NavigationContextProvider>
	);
}
