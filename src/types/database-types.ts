import {
	appUsers,
	workspaces,
	fundingOrganizations,
	grantCfps,
	grantApplications,
	researchAims,
	researchTasks,
} from "db/schema";

export type UserRole = "owner" | "admin" | "member";

export type User = typeof appUsers.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type FundingOrganization = typeof fundingOrganizations.$inferSelect;
export type GrantCFP = typeof grantCfps.$inferSelect;
export type GrantApplication = typeof grantApplications.$inferSelect;
export type ResearchAim = typeof researchAims.$inferSelect;
export type ResearchTask = typeof researchTasks.$inferSelect;
