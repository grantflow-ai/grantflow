import {
	pgTable,
	uuid,
	text,
	timestamp,
	pgEnum,
	boolean,
	varchar,
	index,
	unique,
	primaryKey,
	integer,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "member"]);

export const mailingList = pgTable(
	"mailing_list",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		email: text("email").notNull().unique(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		emailIdx: index("idx_mailing_list_email").on(table.email),
	}),
);

export const users = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name"),
	email: text("email").unique(),
	emailVerified: timestamp("emailVerified", { mode: "date" }),
	image: text("image"),
});

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
	(account) => ({
		compoundKey: primaryKey({
			columns: [account.provider, account.providerAccountId],
		}),
	}),
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
	(verificationToken) => ({
		compositePk: primaryKey({
			columns: [verificationToken.identifier, verificationToken.token],
		}),
	}),
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
	(authenticator) => ({
		compositePK: primaryKey({
			columns: [authenticator.userId, authenticator.credentialID],
		}),
	}),
);

export const workspaces = pgTable(
	"workspaces",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		logoUrl: text("logo_url"),
		description: text("description"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => ({
		deletedAtIdx: index("idx_workspaces_deleted_at").on(table.deletedAt),
	}),
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
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.workspaceId, table.userId] }),
		uniqueWorkspaceUser: unique("unique_workspace_user").on(table.workspaceId, table.userId),
		roleIdx: index("idx_workspace_users_role").on(table.role),
		workspaceIdIdx: index("idx_workspace_users_workspace_id").on(table.workspaceId),
		userIdIdx: index("idx_workspace_users_user_id").on(table.userId),
		deletedAtIdx: index("idx_workspace_users_deleted_at").on(table.deletedAt),
	}),
);

export const fundingOrganizations = pgTable(
	"funding_organizations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: varchar("name", { length: 255 }).notNull(),
		logoUrl: text("logo_url"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => ({
		nameIdx: index("idx_funding_organization_name").on(table.name),
		deletedAtIdx: index("idx_funding_organization_deleted_at").on(table.deletedAt),
	}),
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
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => ({
		codeIdx: index("idx_grant_cfps_identifier").on(table.code),
		fundingOrganizationIdIdx: index("idx_grant_cfps_funding_organization_id").on(table.fundingOrganizationId),
		deletedAtIdx: index("idx_grant_cfps_deleted_at").on(table.deletedAt),
	}),
);

export const grantApplications = pgTable(
	"grant_applications",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade", onUpdate: "cascade" }),
		cfpId: uuid("cfp_id")
			.notNull()
			.references(() => grantCfps.id, { onDelete: "cascade", onUpdate: "cascade" }),
		title: varchar("title", { length: 255 }).notNull(),
		isResubmission: boolean("is_resubmission").notNull().default(false),
		significance: text("significance").notNull(),
		innovation: text("innovation").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => ({
		cfpIdIdx: index("idx_grant_application_grant_cfp_id").on(table.cfpId),
		deletedAtIdx: index("idx_grant_application_deleted_at").on(table.deletedAt),
	}),
);

export const researchAims = pgTable(
	"research_aims",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		applicationId: uuid("application_id")
			.notNull()
			.references(() => grantApplications.id, { onDelete: "cascade", onUpdate: "cascade" }),
		title: varchar("title", { length: 255 }).notNull(),
		description: text("description").notNull(),
		fileUrls: text("file_urls").array(),
		requiredClinicalTrials: boolean("required_clinical_trials").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => ({
		applicationIdIdx: index("idx_research_aims_application_id").on(table.applicationId),
		deletedAtIdx: index("idx_research_aims_deleted_at").on(table.deletedAt),
	}),
);

export const researchTasks = pgTable(
	"research_tasks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		aimId: uuid("aim_id")
			.notNull()
			.references(() => researchAims.id, { onDelete: "cascade", onUpdate: "cascade" }),
		title: varchar("title", { length: 255 }).notNull(),
		description: text("description").notNull(),
		fileUrls: text("file_urls").array(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => ({
		aimIdIdx: index("idx_tasks_aim_id").on(table.aimId),
		deletedAtIdx: index("idx_tasks_deleted_at").on(table.deletedAt),
	}),
);
