import {
	boolean,
	index,
	integer,
	json,
	pgEnum,
	pgTable,
	primaryKey,
	smallint,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { relations } from "drizzle-orm";
import {
	ExecutiveSummaryGenerationResponse,
	InnovationAndSignificanceGenerationResponse,
	ResearchPlanGenerationResponse,
} from "@/types/api-types";

export type FileMapping = Record<
	string, // the remote URL/identifier in storage
	{
		// file attributes, to be displayed in the frontend
		name: string;
		type: string;
		size: number;
	}
>;

export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "member"]);
export const applicationStatus = pgEnum("application_status", ["draft", "completed"]);
export const generationResultType = pgEnum("generation_result_type", [
	"significance-and-innovation",
	"research-plan",
	"executive-summary",
]);

export const mailingList = pgTable(
	"mailing_list",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		email: text("email").notNull().unique(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("idx_mailing_list_email").on(table.email)],
);

export const users = pgTable(
	"users",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name"),
		email: text("email").unique(),
		emailVerified: timestamp("emailVerified", { mode: "date" }),
		image: text("image"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("idx_users_email").on(table.email)],
);

export const accounts = pgTable(
	"accounts",
	{
		userId: uuid("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: text("type").$type<AdapterAccountType>().notNull(),
		provider: text("provider").notNull(),
		providerAccountId: text("providerAccountId").notNull(),
		refresh_token: text("refresh_token"),
		access_token: text("access_token"),
		expires_at: integer("expires_at"),
		token_type: text("token_type"),
		scope: text("scope"),
		id_token: text("id_token"),
		session_state: text("session_state"),
	},
	(account) => [
		primaryKey({
			columns: [account.provider, account.providerAccountId],
		}),
	],
);

export const sessions = pgTable("sessions", {
	sessionToken: text("sessionToken").primaryKey(),
	userId: uuid("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
	"verification_tokens",
	{
		identifier: text("identifier").notNull(),
		token: text("token").notNull(),
		expires: timestamp("expires", { mode: "date" }).notNull(),
	},
	(verificationToken) => [
		primaryKey({
			columns: [verificationToken.identifier, verificationToken.token],
		}),
		index("idx_verification_tokens_token").on(verificationToken.token),
	],
);

export const authenticators = pgTable(
	"authenticators",
	{
		credentialID: text("credentialID").notNull().unique(),
		userId: uuid("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		providerAccountId: text("providerAccountId").notNull(),
		credentialPublicKey: text("credentialPublicKey").notNull(),
		counter: integer("counter").notNull(),
		credentialDeviceType: text("credentialDeviceType").notNull(),
		credentialBackedUp: boolean("credentialBackedUp").notNull(),
		transports: text("transports"),
	},
	(authenticator) => [
		primaryKey({
			columns: [authenticator.userId, authenticator.credentialID],
		}),
	],
);

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
	isResubmission: boolean("is_resubmission").notNull().default(false),
	status: applicationStatus("status").notNull().default("draft"),
});

export const grantApplicationRelations = relations(grantApplications, ({ one }) => ({
	significance: one(researchSignificances),
	innovation: one(researchInnovations),
}));

export const researchSignificances = pgTable("research_significances", {
	id: uuid("id").primaryKey().defaultRandom(),
	applicationId: uuid("application_id")
		.notNull()
		.references(() => grantApplications.id, { onDelete: "cascade", onUpdate: "cascade" }),
	text: text("text").notNull(),
	files: json().$type<FileMapping>(),
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
	files: json().$type<FileMapping>(),
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
	files: json().$type<FileMapping>(),
	requiresClinicalTrials: boolean("requires_clinical_trials").notNull().default(false),
});

export const researchTasks = pgTable("research_tasks", {
	id: uuid("id").primaryKey().defaultRandom(),
	aimId: uuid("aim_id")
		.notNull()
		.references(() => researchAims.id, { onDelete: "cascade", onUpdate: "cascade" }),
	title: varchar("title", { length: 255 }).notNull(),
	description: text("description").notNull(),
	files: json().$type<FileMapping>(),
});

export const generationResults = pgTable(
	"generation_results",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		applicationId: uuid("application_id")
			.notNull()
			.references(() => grantApplications.id, { onDelete: "cascade", onUpdate: "cascade" }),
		version: smallint("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		type: generationResultType("type").notNull(),
		data: json().$type<
			| InnovationAndSignificanceGenerationResponse
			| ResearchPlanGenerationResponse
			| ExecutiveSummaryGenerationResponse
		>(),
	},
	(table) => [
		index("idx_generation_results_section_type").on(table.type),
		uniqueIndex("idx_generation_results_application_type_version").on(
			table.applicationId,
			table.type,
			table.version,
		),
	],
);
