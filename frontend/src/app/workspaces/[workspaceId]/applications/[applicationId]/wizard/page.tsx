import { notFound } from "next/navigation";
import { retrieveApplication } from "@/actions/grant-applications";
import { WizardClientComponent } from "@/components/workspaces/wizard";

export default async function WizardPage({
	params,
}: {
	params: Promise<{ applicationId: string; workspaceId: string }>;
}) {
	const { applicationId, workspaceId } = await params;

	let application: Awaited<ReturnType<typeof retrieveApplication>>;
	try {
		application = await retrieveApplication(workspaceId, applicationId);
	} catch {
		notFound();
	}

	return <WizardClientComponent application={application} workspaceId={workspaceId} />;
}
