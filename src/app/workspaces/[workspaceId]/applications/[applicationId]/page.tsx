import { getDatabaseClient } from "db/connection";
import { eq } from "drizzle-orm";
import { grantApplications } from "db/schema";

export default async function ApplicationDetailPage(props: {
	params: Promise<{
		workspaceId: string;
		applicationId: string;
	}>;
}) {
	const { workspaceId, applicationId } = await props.params;

	if (!workspaceId || !applicationId) {
		return null;
	}

	const db = getDatabaseClient();
	const grantApplication = await db.query.grantApplications.findFirst({
		where: eq(grantApplications.id, applicationId),
	});

	if (!grantApplication) {
		return null;
	}

	return (
		<div className="container">
			<span>{grantApplication.title}</span>
		</div>
	);
}
