import {
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./auth-schema";
// we re-export the schema from the next-auth-schema file
export * from "./auth-schema";

export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "member"]);
export const applicationStatus = pgEnum("application_status", ["draft", "completed"]);
export const applicationSections = pgEnum("application_section", ["significance-and-innovation", "research-plan"]);

export const workspaces = pgTable(
	"workspaces",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		logoUrl: text("logo_url"),
		description: text("description"),
	},
	(table) => [index("idx_workspaces_name").on(table.name)],
);

export const workspaceUsers = pgTable(
	"workspace_users",
	{
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade", onUpdate: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
		role: userRoleEnum("role").notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.workspaceId, table.userId] }),
		unique("unique_workspace_user").on(table.workspaceId, table.userId),
	],
);

export const fundingOrganizations = pgTable(
	"funding_organizations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: varchar("name", { length: 255 }).notNull(),
		logoUrl: text("logo_url"),
	},
	(table) => [index("idx_funding_organization_name").on(table.name)],
);

export const grantCfps = pgTable(
	"grant_cfps",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		fundingOrganizationId: uuid("funding_organization_id")
			.notNull()
			.references(() => fundingOrganizations.id, { onDelete: "cascade", onUpdate: "cascade" }),
		allowClinicalTrials: boolean("allow_clinical_trials").notNull().default(true),
		allowResubmissions: boolean("allow_resubmissions").notNull().default(true),
		category: varchar("category", { length: 255 }),
		code: varchar("code", { length: 255 }).notNull(),
		description: text("description"),
		title: varchar("title", { length: 255 }).notNull(),
		url: text("url"),
	},
	(table) => [index("idx_grant_cfps_identifier").on(table.code)],
);

export const grantApplications = pgTable("grant_applications", {
	id: uuid("id").primaryKey().defaultRandom(),
	workspaceId: uuid("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade", onUpdate: "cascade" }),
	cfpId: uuid("cfp_id")
		.notNull()
		.references(() => grantCfps.id, { onDelete: "cascade", onUpdate: "cascade" }),
	title: varchar("title", { length: 255 }).notNull(),
	status: applicationStatus("status").notNull().default("draft"),
});

export const grantApplicationRelations = relations(grantApplications, ({ one }) => ({
	significance: one(researchSignificances),
	innovation: one(researchInnovations),
}));

export const applicationFiles = pgTable("application_files", {
	id: uuid("id").primaryKey().defaultRandom(),
	applicationId: uuid("application_id")
		.notNull()
		.references(() => grantApplications.id, { onDelete: "cascade", onUpdate: "cascade" }),
	section: applicationSections("section").notNull(),
	blobUrl: text("blob_url").notNull(),
	name: varchar("filename", { length: 255 }).notNull(),
	type: varchar("type", { length: 255 }).notNull(),
	size: integer("size").notNull(),
});

export const researchSignificances = pgTable("research_significances", {
	id: uuid("id").primaryKey().defaultRandom(),
	applicationId: uuid("application_id")
		.notNull()
		.references(() => grantApplications.id, { onDelete: "cascade", onUpdate: "cascade" }),
	text: text("text").notNull(),
});

export const researchSignificancesRelations = relations(researchSignificances, ({ one }) => ({
	application: one(grantApplications, {
		fields: [researchSignificances.applicationId],
		references: [grantApplications.id],
	}),
}));

export const researchInnovations = pgTable("research_innovations", {
	id: uuid("id").primaryKey().defaultRandom(),
	applicationId: uuid("application_id")
		.notNull()
		.references(() => grantApplications.id, { onDelete: "cascade", onUpdate: "cascade" }),
	text: text("text").notNull(),
});

export const researchInnovationRelations = relations(researchInnovations, ({ one }) => ({
	application: one(grantApplications, {
		fields: [researchInnovations.applicationId],
		references: [grantApplications.id],
	}),
}));

export const researchAims = pgTable("research_aims", {
	id: uuid("id").primaryKey().defaultRandom(),
	applicationId: uuid("application_id")
		.notNull()
		.references(() => grantApplications.id, { onDelete: "cascade", onUpdate: "cascade" }),
	title: varchar("title", { length: 255 }).notNull(),
	description: text("description").notNull(),
	requiresClinicalTrials: boolean("requires_clinical_trials").notNull().default(false),
});

export const researchTasks = pgTable("research_tasks", {
	id: uuid("id").primaryKey().defaultRandom(),
	aimId: uuid("aim_id")
		.notNull()
		.references(() => researchAims.id, { onDelete: "cascade", onUpdate: "cascade" }),
	title: varchar("title", { length: 255 }).notNull(),
	description: text("description").notNull(),
});

export const generationResults = pgTable("generation_results", {
	id: uuid("id").primaryKey().defaultRandom(),
	applicationId: uuid("application_id")
		.notNull()
		.references(() => grantApplications.id, { onDelete: "cascade", onUpdate: "cascade" }),
	ticketId: uuid("ticket_id").notNull(),
	duration: integer(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	text: text("text").notNull(),
});
