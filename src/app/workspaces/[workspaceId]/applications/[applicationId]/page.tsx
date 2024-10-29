import { getDatabaseClient } from "db/connection";
import { eq, inArray } from "drizzle-orm";
import { grantApplications, grantCfps } from "db/schema";
import { redirect } from "next/navigation";
import { PagePath } from "@/enums";
import { GrantApplicationWizard } from "@/components/workspaces/detail/applications/grant-application-wizard";
import { Navbar } from "@/components/navbar";

export default async function ApplicationDetailPage(props: {
	params: Promise<{
		workspaceId: string;
		applicationId: string;
	}>;
}) {
	const { workspaceId, applicationId } = await props.params;

	if (!workspaceId || !applicationId) {
		redirect(PagePath.WORKSPACES);
		return null;
	}

	const db = getDatabaseClient();
	const application = await db.query.grantApplications.findFirst({
		where: eq(grantApplications.id, applicationId),
	});

	if (!application) {
		// TODO: redirect to 404 page
		return null;
	}

	if (application.status === "draft") {
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

		return (
			<div className="flex flex-col flex-1 ml-14">
				<Navbar>
					<span className="px-2 text-sm">Create New Grant Application</span>
				</Navbar>
				<div className="mt-14 p-4">
					<div className="container">
						<section className="py-5">
							<h1 className="text-2xl bold">Grant Application Wizard</h1>
						</section>
						<section>
							<GrantApplicationWizard cfps={cfps} workspaceId={workspaceId} application={application} />
						</section>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col flex-1 ml-14">
			<Navbar>
				<span className="px-2 text-sm">{`${application.title} workspace`}</span>
			</Navbar>
			<div className="mt-14 p-4">
				<div className="container">
					<span>{application.title}</span>
				</div>
			</div>
		</div>
	);
}
