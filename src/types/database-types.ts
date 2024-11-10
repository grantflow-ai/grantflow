import {
	users,
	workspaces,
	fundingOrganizations,
	grantCfps,
	grantApplications,
	researchSignificances,
	researchInnovations,
	researchAims,
	researchTasks,
	workspaceUsers,
} from "db/schema";

export type UserRole = "owner" | "admin" | "member";

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceUser = typeof workspaceUsers.$inferSelect;
export type FundingOrganization = typeof fundingOrganizations.$inferSelect;
export type GrantCFP = typeof grantCfps.$inferSelect;
export type GrantApplication = typeof grantApplications.$inferSelect;
export type ResearchSignificance = typeof researchSignificances.$inferSelect;
export type ResearchInnovation = typeof researchInnovations.$inferSelect;
export type ResearchAim = typeof researchAims.$inferSelect;
export type ResearchTask = typeof researchTasks.$inferSelect;

export type NewUser = typeof users.$inferInsert;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type NewWorkspaceUser = typeof workspaceUsers.$inferInsert;
export type NewFundingOrganization = typeof fundingOrganizations.$inferInsert;
export type NewGrantCFP = typeof grantCfps.$inferInsert;
export type NewGrantApplication = typeof grantApplications.$inferInsert;
export type NewResearchSignificance = typeof researchSignificances.$inferInsert;
export type NewResearchInnovation = typeof researchInnovations.$inferInsert;
export type NewResearchAim = typeof researchAims.$inferInsert;
export type NewResearchTask = typeof researchTasks.$inferInsert;
