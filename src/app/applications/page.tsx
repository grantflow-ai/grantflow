import { getDatabaseClient } from "db/connection";
import { inArray } from "drizzle-orm";
import { grantCfps } from "db/schema";
import { WizardFormPage } from "@/components/applications/wizard";

export default async function ApplicationCreateView(props: {
	searchParams: Promise<{
		workspaceId: string;
	}>;
}) {
	const searchParams = await props.searchParams;

	const { workspaceId } = searchParams;

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
		<div className="container mx-auto p-4">
			<WizardFormPage cfps={cfps} workspaceId={workspaceId} />
		</div>
	);
}
