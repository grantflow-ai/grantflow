/* eslint-disable no-console */
import { getDatabaseClient } from "db/connection";
import {
	accounts,
	fundingOrganizations,
	grantCfps,
	users,
	workspaces,
	workspaceUsers,
	grantApplications,
	researchSignificances,
	researchInnovations,
	researchTasks,
	researchAims,
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
import {
	FundingOrganization,
	GrantApplication,
	GrantCFP,
	ResearchAim,
	ResearchInnovation,
	ResearchSignificance,
	ResearchTask,
	User,
	Workspace,
} from "@/types/database-types";

async function seedDatabase() {
	const db = getDatabaseClient();

	console.log("Seeding database...");
	await db.insert(users).values(userRecords as unknown as User[]);
	await db.insert(accounts).values(accountRecords as never[]);
	await db.insert(fundingOrganizations).values(fundingOrganizationRecords as unknown as FundingOrganization[]);
	await db.insert(grantCfps).values(grantCFPRecords as unknown as GrantCFP[]);
	await db.insert(workspaces).values(workspaceRecords as unknown as Workspace[]);
	await db.insert(workspaceUsers).values(workspaceUserRecords as never[]);
	await db.insert(grantApplications).values(grantApplicationsRecords as unknown as GrantApplication[]);
	await db.insert(researchSignificances).values(researchSignificancesRecords as unknown as ResearchSignificance[]);
	await db.insert(researchInnovations).values(researchInnovationsRecords as unknown as ResearchInnovation[]);
	await db.insert(researchAims).values(researchAimsRecords as unknown as ResearchAim[]);
	await db.insert(researchTasks).values(researchTasksRecords as unknown as ResearchTask[]);
	console.log("Database seeded successfully");
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void seedDatabase();
