import { getDatabaseClient } from "db/connection";
import { and, eq, inArray } from "drizzle-orm";
import { grantApplications, grantCfps } from "db/schema";
import { WizardFormPage } from "@/components/workspaces/detail/applications/wizard";

export default async function ApplicationCreatePage(props: {
	params: Promise<{
		workspaceId: string;
	}>;
}) {
	const { workspaceId } = await props.params;

	if (!workspaceId) {
		return null;
	}

	const db = getDatabaseClient();
	const cfps = await db.query.grantCfps.findMany({
		where: inArray(grantCfps.code, [
			"R01",
			"R03",
			"R18",
			"R21",
			"R24",
			"R25",
			"R33",
			"R34",
			"R35",
			"R41",
			"R42",
			"R43",
			"R44",
			"R50",
			"R61",
		]),
	});

	const application = await db.query.grantApplications.findFirst({
		where: and(eq(grantApplications.workspaceId, workspaceId), eq(grantApplications.status, "draft")),
	});

	return (
		<div className="container">
			<section className="py-5">
				<h1 className="text-2xl bold">Grant Application Wizard</h1>
			</section>
			<section>
				<WizardFormPage cfps={cfps} workspaceId={workspaceId} application={application} />
			</section>
		</div>
	);
}
