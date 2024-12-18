"use server";

import { ApplicationWorkspace } from "@/components/workspaces/detail/applications/detail/application-workspace";
import { getApplication } from "@/actions/api";

export default async function ApplicationDetailPage({
	params,
}: {
	params: Promise<{ workspaceId: string; applicationId: string }>;
}) {
	const { workspaceId, applicationId } = await params;

	const application = await getApplication(workspaceId, applicationId);

	return <ApplicationWorkspace workspaceId={workspaceId} application={application} />;
}
