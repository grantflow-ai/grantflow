"use server";

import { ApplicationWorkspace } from "@/components/workspaces/detail/applications/detail/application-workspace";

export default async function ApplicationDetailPage({
	params,
}: {
	params: Promise<{ workspaceId: string; applicationId: string }>;
}) {
	const { workspaceId, applicationId } = await params;

	return <ApplicationWorkspace workspaceId={workspaceId} applicationId={applicationId} />;
}
