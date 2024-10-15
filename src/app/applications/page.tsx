import { CFPCombobox } from "@/components/applications/cfp-combobox";
import { getDatabaseClient } from "db/connection";
import { inArray } from "drizzle-orm";
import { grantCfps } from "db/schema";

export default async function ApplicationCreateView({
	searchParams: { workspaceId },
}: {
	searchParams: {
		workspaceId: string;
	};
}) {
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
		<div>
			<h1>{workspaceId}</h1>
			<CFPCombobox cfps={cfps} />
		</div>
	);
}
