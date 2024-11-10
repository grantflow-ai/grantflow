import { getDatabaseClient } from "db/connection";
import { inArray } from "drizzle-orm";
import { grantCfps } from "db/schema";
import { GrantApplicationWizard } from "@/components/workspaces/detail/applications/grant-application-wizard";
import { redirect } from "next/navigation";
import { PagePath } from "@/enums";
import { Navbar } from "@/components/navbar";

export default async function ApplicationCreatePage(props: {
	params: Promise<{
		workspaceId: string;
	}>;
}) {
	const { workspaceId } = await props.params;

	if (!workspaceId) {
		redirect(PagePath.WORKSPACES);
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
						<GrantApplicationWizard cfps={cfps} workspaceId={workspaceId} />
					</section>
				</div>
			</div>
		</div>
	);
}
