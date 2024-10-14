/* eslint-disable no-console */
import nihActivityCodes from "./nih-activity-codes.json";
import { getDatabaseClient } from "db/connection";
import { fundingOrganizations, grantCfps } from "db/schema";

interface CFPRecord {
	category: string;
	code: string;
	title: string;
	description: string;
	url?: string;
}

async function seedDatabase() {
	const db = await getDatabaseClient();

	const [{ fundingOrganizationId }] = await db
		.insert(fundingOrganizations)
		.values({
			name: "NIH",
		})
		.returning({ fundingOrganizationId: fundingOrganizations.id });

	console.log("Funding organization inserted");

	const results = await db
		.insert(grantCfps)
		.values(
			(nihActivityCodes as CFPRecord[]).map(({ url, ...cfp }) => ({
				...cfp,
				url: url ?? null,
				fundingOrganizationId,
			})),
		)
		.returning({ id: fundingOrganizations.id });

	console.log(`Inserted ${results.length} records`);
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void seedDatabase();
