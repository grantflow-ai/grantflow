"use server";

import { getApplication } from "@/actions/api";
import { ApplicationWorkspace } from "@/components/workspaces/detail/applications/detail/application-workspace";

export default async function ApplicationDetailPage({
	params,
}: {
	params: Promise<{ applicationId: string; workspaceId: string }>;
}) {
	const { applicationId, workspaceId } = await params;

	const application = await getApplication(workspaceId, applicationId);

	return <ApplicationWorkspace application={application} workspaceId={workspaceId} />;
}
