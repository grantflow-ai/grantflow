import { redirect } from "next/navigation";
import { retrieveApplication } from "@/actions/grant-applications";
import { EditorContainer } from "@/components/projects/applications/editor/editor-container";
import { PagePath } from "@/enums";

export default async function EditorPage({
	params,
}: {
	params: Promise<{ applicationId: string; projectId: string }>;
}) {
	const { applicationId, projectId } = await params;

	let application: Awaited<ReturnType<typeof retrieveApplication>>;
	try {
		application = await retrieveApplication(projectId, applicationId);
	} catch {
		redirect(`/projects/${projectId}`);
	}

	if (!application.text) {
		const wizardUrl = PagePath.APPLICATION_WIZARD.replace(":projectId", projectId).replace(
			":applicationId",
			applicationId,
		);
		redirect(wizardUrl);
	}

	return <EditorContainer />;
}
