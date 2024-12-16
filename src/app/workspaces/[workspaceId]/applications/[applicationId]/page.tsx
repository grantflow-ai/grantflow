"use server";

import { ApplicationWorkspace } from "@/components/workspaces/detail/applications/detail/application-workspace";
import { getApplicationText } from "@/app/actions/api";

export default async function ApplicationDetailPage({
	params,
}: {
	params: Promise<{ workspaceId: string; applicationId: string }>;
}) {
	const { workspaceId, applicationId } = await params;

	const applicationText = await getApplicationText(workspaceId, applicationId);

	return (
		<ApplicationWorkspace
			workspaceId={workspaceId}
			applicationId={applicationId}
			content={(Reflect.get(applicationText, "text") as string | undefined) ?? null}
		/>
	);
}
