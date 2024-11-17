/* eslint-disable no-console */
import { getDatabaseClient } from "db/connection";
import {
	accounts,
	fundingOrganizations,
	grantApplications,
	grantCfps,
	researchAims,
	researchInnovations,
	researchSignificances,
	researchTasks,
	users,
	workspaces,
	workspaceUsers,
} from "db/schema";
import userRecords from "./users.json";
import accountRecords from "./accounts.json";
import fundingOrganizationRecords from "./funding_organizations.json";
import grantCFPRecords from "./grant_cfps.json";
import workspaceRecords from "./workspaces.json";
import grantApplicationsRecords from "./grant_applications.json";
import workspaceUserRecords from "./workspace_users.json";
import researchSignificancesRecords from "./research_significances.json";
import researchInnovationsRecords from "./research_innovations.json";
import researchAimsRecords from "./research_aims.json";
import researchTasksRecords from "./research_tasks.json";

async function seedDatabase() {
	const db = getDatabaseClient();

	console.log("Seeding database...");
	await db.insert(users).values(userRecords);
	await db.insert(accounts).values(accountRecords as never);
	await db.insert(fundingOrganizations).values(fundingOrganizationRecords);
	await db.insert(grantCfps).values(grantCFPRecords);
	await db.insert(workspaces).values(workspaceRecords);
	await db.insert(workspaceUsers).values(workspaceUserRecords as never);
	await db.insert(grantApplications).values(grantApplicationsRecords as never);
	await db.insert(researchSignificances).values(researchSignificancesRecords);
	await db.insert(researchInnovations).values(researchInnovationsRecords);
	await db.insert(researchAims).values(researchAimsRecords as never);
	await db.insert(researchTasks).values(researchTasksRecords);
	console.log("Database seeded successfully");
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void seedDatabase();
