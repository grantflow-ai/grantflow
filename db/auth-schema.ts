import { boolean, index, integer, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "member"]);
export const applicationStatus = pgEnum("application_status", ["draft", "completed"]);

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
