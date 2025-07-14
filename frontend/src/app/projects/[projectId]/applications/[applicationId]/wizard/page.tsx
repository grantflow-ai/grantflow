import { notFound } from "next/navigation";
import { retrieveApplication } from "@/actions/grant-applications";
import { WizardClientComponent } from "@/components/projects/wizard";

export default async function WizardPage({
	params,
}: {
	params: Promise<{ applicationId: string; projectId: string }>;
}) {
	const { applicationId, projectId } = await params;

	let application: Awaited<ReturnType<typeof retrieveApplication>>;
	try {
		application = await retrieveApplication(projectId, applicationId);
	} catch {
		notFound();
	}

	return <WizardClientComponent application={application} projectId={projectId} />;
}
