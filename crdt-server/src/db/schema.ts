import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	check,
	date,
	foreignKey,
	index,
	json,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
	varchar,
	vector,
} from "drizzle-orm/pg-core";

export const applicationstatusenum = pgEnum("applicationstatusenum", [
	"WORKING_DRAFT",
	"IN_PROGRESS",
	"GENERATING",
	"CANCELLED",
]);
export const notificationtypeenum = pgEnum("notificationtypeenum", [
	"DEADLINE",
	"INFO",
	"WARNING",
	"SUCCESS",
]);
export const raggenerationstatusenum = pgEnum("raggenerationstatusenum", [
	"PENDING",
	"PROCESSING",
	"COMPLETED",
	"FAILED",
	"CANCELLED",
]);
export const sourceindexingstatusenum = pgEnum("sourceindexingstatusenum", [
	"CREATED",
	"INDEXING",
	"FINISHED",
	"FAILED",
]);
export const userroleenum = pgEnum("userroleenum", [
	"OWNER",
	"ADMIN",
	"COLLABORATOR",
]);

export const alembicVersion = pgTable("alembic_version", {
	versionNum: varchar("version_num", { length: 32 }).primaryKey().notNull(),
});

export const ragGenerationJobs = pgTable(
	"rag_generation_jobs",
	{
		checkpointData: json("checkpoint_data"),
		completedAt: timestamp("completed_at", {
			mode: "string",
			withTimezone: true,
		}),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		currentStage: bigint("current_stage", { mode: "number" }).notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		errorDetails: json("error_details"),
		errorMessage: text("error_message"),
		failedAt: timestamp("failed_at", { mode: "string", withTimezone: true }),
		id: uuid().primaryKey().notNull(),
		jobType: varchar("job_type", { length: 50 }).notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		retryCount: bigint("retry_count", { mode: "number" }).notNull(),
		startedAt: timestamp("started_at", { mode: "string", withTimezone: true }),
		status: raggenerationstatusenum().notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		totalStages: bigint("total_stages", { mode: "number" }).notNull(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("idx_rag_generation_jobs_status_created").using(
			"btree",
			table.status.asc().nullsLast().op("timestamptz_ops"),
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("idx_rag_generation_jobs_status_retry").using(
			"btree",
			table.status.asc().nullsLast().op("enum_ops"),
			table.retryCount.asc().nullsLast().op("int8_ops"),
		),
		index("ix_rag_generation_jobs_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_rag_generation_jobs_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_rag_generation_jobs_status").using(
			"btree",
			table.status.asc().nullsLast().op("enum_ops"),
		),
		check("check_current_stage_non_negative", sql`current_stage >= 0`),
		check("check_retry_count_non_negative", sql`retry_count >= 0`),
		check("check_total_stages_positive", sql`total_stages > 0`),
	],
);

export const generationNotifications = pgTable(
	"generation_notifications",
	{
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		currentPipelineStage: bigint("current_pipeline_stage", { mode: "number" }),
		data: json(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		event: varchar({ length: 100 }).notNull(),
		id: uuid().primaryKey().notNull(),
		message: text().notNull(),
		notificationType: varchar("notification_type", { length: 20 }).notNull(),
		ragJobId: uuid("rag_job_id").notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		totalPipelineStages: bigint("total_pipeline_stages", { mode: "number" }),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("idx_rag_notifications_job_created").using(
			"btree",
			table.ragJobId.asc().nullsLast().op("timestamptz_ops"),
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_generation_notifications_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_generation_notifications_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_generation_notifications_event").using(
			"btree",
			table.event.asc().nullsLast().op("text_ops"),
		),
		index("ix_generation_notifications_rag_job_id").using(
			"btree",
			table.ragJobId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.ragJobId],
			foreignColumns: [ragGenerationJobs.id],
			name: "generation_notifications_rag_job_id_fkey",
		}).onDelete("cascade"),
	],
);

export const grantingInstitutions = pgTable(
	"granting_institutions",
	{
		abbreviation: varchar({ length: 64 }),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		fullName: varchar("full_name", { length: 255 }).notNull(),
		id: uuid().primaryKey().notNull(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("ix_granting_institutions_abbreviation").using(
			"btree",
			table.abbreviation.asc().nullsLast().op("text_ops"),
		),
		index("ix_granting_institutions_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_granting_institutions_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		unique("granting_institutions_full_name_key").on(table.fullName),
	],
);

export const ragSources = pgTable(
	"rag_sources",
	{
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		id: uuid().primaryKey().notNull(),
		indexingStatus: sourceindexingstatusenum("indexing_status").notNull(),
		sourceType: varchar("source_type", { length: 50 }).notNull(),
		textContent: text("text_content"),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("ix_rag_sources_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_rag_sources_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_rag_sources_indexing_status").using(
			"btree",
			table.indexingStatus.asc().nullsLast().op("enum_ops"),
		),
	],
);

export const organizations = pgTable(
	"organizations",
	{
		contactEmail: varchar("contact_email", { length: 255 }),
		contactPersonName: varchar("contact_person_name", { length: 200 }),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		description: text(),
		id: uuid().primaryKey().notNull(),
		institutionalAffiliation: varchar("institutional_affiliation", {
			length: 200,
		}),
		logoUrl: text("logo_url"),
		name: varchar({ length: 255 }).notNull(),
		settings: json().default({}),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("ix_organizations_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_organizations_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_organizations_name").using(
			"btree",
			table.name.asc().nullsLast().op("text_ops"),
		),
	],
);

export const organizationAuditLogs = pgTable(
	"organization_audit_logs",
	{
		action: varchar({ length: 50 }).notNull(),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		details: json(),
		id: uuid().primaryKey().notNull(),
		ipAddress: varchar("ip_address", { length: 45 }),
		organizationId: uuid("organization_id").notNull(),
		targetUserFirebaseUid: varchar("target_user_firebase_uid", { length: 128 }),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
		userFirebaseUid: varchar("user_firebase_uid", { length: 128 }).notNull(),
	},
	(table) => [
		index("idx_audit_org_created").using(
			"btree",
			table.organizationId.asc().nullsLast().op("timestamptz_ops"),
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("idx_audit_org_user_action").using(
			"btree",
			table.organizationId.asc().nullsLast().op("uuid_ops"),
			table.userFirebaseUid.asc().nullsLast().op("text_ops"),
			table.action.asc().nullsLast().op("text_ops"),
		),
		index("ix_organization_audit_logs_action").using(
			"btree",
			table.action.asc().nullsLast().op("text_ops"),
		),
		index("ix_organization_audit_logs_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_organization_audit_logs_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_organization_audit_logs_organization_id").using(
			"btree",
			table.organizationId.asc().nullsLast().op("uuid_ops"),
		),
		index("ix_organization_audit_logs_user_firebase_uid").using(
			"btree",
			table.userFirebaseUid.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_audit_logs_organization_id_fkey",
		}).onDelete("cascade"),
	],
);

export const organizationInvitations = pgTable(
	"organization_invitations",
	{
		acceptedAt: timestamp("accepted_at", {
			mode: "string",
			withTimezone: true,
		}),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		email: varchar({ length: 255 }).notNull(),
		id: uuid().primaryKey().notNull(),
		invitationSentAt: timestamp("invitation_sent_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
		organizationId: uuid("organization_id").notNull(),
		role: userroleenum().notNull(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("idx_org_invitation_status").using(
			"btree",
			table.organizationId.asc().nullsLast().op("uuid_ops"),
			table.acceptedAt.asc().nullsLast().op("uuid_ops"),
		),
		index("ix_organization_invitations_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_organization_invitations_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_organization_invitations_email").using(
			"btree",
			table.email.asc().nullsLast().op("text_ops"),
		),
		index("ix_organization_invitations_organization_id").using(
			"btree",
			table.organizationId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_invitations_organization_id_fkey",
		}).onDelete("cascade"),
		unique("uq_org_invitation_email").on(table.organizationId, table.email),
	],
);

export const projects = pgTable(
	"projects",
	{
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		description: text(),
		id: uuid().primaryKey().notNull(),
		logoUrl: text("logo_url"),
		name: varchar({ length: 255 }).notNull(),
		organizationId: uuid("organization_id").notNull(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("idx_project_org_name").using(
			"btree",
			table.organizationId.asc().nullsLast().op("uuid_ops"),
			table.name.asc().nullsLast().op("text_ops"),
		),
		index("ix_projects_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_projects_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_projects_name").using(
			"btree",
			table.name.asc().nullsLast().op("text_ops"),
		),
		index("ix_projects_organization_id").using(
			"btree",
			table.organizationId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "projects_organization_id_fkey",
		}).onDelete("cascade"),
	],
);

export const ragFiles = pgTable(
	"rag_files",
	{
		bucketName: varchar("bucket_name", { length: 255 }).notNull(),
		filename: varchar({ length: 255 }).notNull(),
		id: uuid().primaryKey().notNull(),
		mimeType: varchar("mime_type", { length: 255 }).notNull(),
		objectPath: varchar("object_path", { length: 255 }).notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		size: bigint({ mode: "number" }).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.id],
			foreignColumns: [ragSources.id],
			name: "rag_files_id_fkey",
		}).onDelete("cascade"),
		unique("uq_bucket_object").on(table.bucketName, table.objectPath),
		check("check_positive_file_size", sql`size >= 0`),
	],
);

export const ragUrls = pgTable(
	"rag_urls",
	{
		description: text(),
		id: uuid().primaryKey().notNull(),
		title: varchar({ length: 255 }),
		url: text().notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.id],
			foreignColumns: [ragSources.id],
			name: "rag_urls_id_fkey",
		}).onDelete("cascade"),
		unique("rag_urls_url_key").on(table.url),
	],
);

export const textVectors = pgTable(
	"text_vectors",
	{
		chunk: json().notNull(),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		embedding: vector({ dimensions: 384 }).notNull(),
		id: uuid().primaryKey().notNull(),
		ragSourceId: uuid("rag_source_id").notNull(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("idx_text_vectors_embedding")
			.using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops"))
			.with({ ef_construction: "256", m: "48" }),
		index("ix_text_vectors_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_text_vectors_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_text_vectors_rag_source_id").using(
			"btree",
			table.ragSourceId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.ragSourceId],
			foreignColumns: [ragSources.id],
			name: "text_vectors_rag_source_id_fkey",
		}).onDelete("cascade"),
	],
);

export const grantApplications = pgTable(
	"grant_applications",
	{
		completedAt: timestamp("completed_at", {
			mode: "string",
			withTimezone: true,
		}),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		description: text(),
		formInputs: json("form_inputs"),
		id: uuid().primaryKey().notNull(),
		parentId: uuid("parent_id"),
		projectId: uuid("project_id").notNull(),
		ragJobId: uuid("rag_job_id"),
		researchObjectives: json("research_objectives"),
		status: applicationstatusenum().notNull(),
		text: text(),
		title: varchar({ length: 500 }).notNull(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("idx_grant_app_project_status").using(
			"btree",
			table.projectId.asc().nullsLast().op("uuid_ops"),
			table.status.asc().nullsLast().op("uuid_ops"),
		),
		index("idx_grant_app_project_status_created").using(
			"btree",
			table.projectId.asc().nullsLast().op("timestamptz_ops"),
			table.status.asc().nullsLast().op("timestamptz_ops"),
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_grant_applications_completed_at").using(
			"btree",
			table.completedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_grant_applications_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_grant_applications_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_grant_applications_parent_id").using(
			"btree",
			table.parentId.asc().nullsLast().op("uuid_ops"),
		),
		index("ix_grant_applications_project_id").using(
			"btree",
			table.projectId.asc().nullsLast().op("uuid_ops"),
		),
		index("ix_grant_applications_rag_job_id").using(
			"btree",
			table.ragJobId.asc().nullsLast().op("uuid_ops"),
		),
		index("ix_grant_applications_status").using(
			"btree",
			table.status.asc().nullsLast().op("enum_ops"),
		),
		foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "grant_applications_parent_id_fkey",
		}).onDelete("set null"),
		foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "grant_applications_project_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.ragJobId],
			foreignColumns: [ragGenerationJobs.id],
			name: "grant_applications_rag_job_id_fkey",
		}).onDelete("set null"),
	],
);

export const notifications = pgTable(
	"notifications",
	{
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		dismissed: boolean().notNull(),
		expiresAt: timestamp("expires_at", { mode: "string", withTimezone: true }),
		extraData: json("extra_data").default({}),
		firebaseUid: varchar("firebase_uid", { length: 128 }).notNull(),
		id: uuid().primaryKey().notNull(),
		message: text().notNull(),
		organizationId: uuid("organization_id"),
		projectId: uuid("project_id"),
		projectName: varchar("project_name", { length: 255 }),
		read: boolean().notNull(),
		title: varchar({ length: 255 }).notNull(),
		type: notificationtypeenum().notNull(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("idx_notifications_user_active")
			.using("btree", table.firebaseUid.asc().nullsLast().op("text_ops"))
			.where(sql`(dismissed = false)`),
		index("idx_notifications_user_created").using(
			"btree",
			table.firebaseUid.asc().nullsLast().op("text_ops"),
			table.createdAt.asc().nullsLast().op("text_ops"),
		),
		index("ix_notifications_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_notifications_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_notifications_firebase_uid").using(
			"btree",
			table.firebaseUid.asc().nullsLast().op("text_ops"),
		),
		index("ix_notifications_organization_id").using(
			"btree",
			table.organizationId.asc().nullsLast().op("uuid_ops"),
		),
		index("ix_notifications_project_id").using(
			"btree",
			table.projectId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "notifications_organization_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "notifications_project_id_fkey",
		}).onDelete("cascade"),
	],
);

export const grantApplicationGenerationJobs = pgTable(
	"grant_application_generation_jobs",
	{
		generatedSections: json("generated_sections"),
		grantApplicationId: uuid("grant_application_id").notNull(),
		id: uuid().primaryKey().notNull(),
		validationResults: json("validation_results"),
	},
	(table) => [
		uniqueIndex(
			"ix_grant_application_generation_jobs_grant_application_id",
		).using("btree", table.grantApplicationId.asc().nullsLast().op("uuid_ops")),
		foreignKey({
			columns: [table.grantApplicationId],
			foreignColumns: [grantApplications.id],
			name: "grant_application_generation_jobs_grant_application_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.id],
			foreignColumns: [ragGenerationJobs.id],
			name: "grant_application_generation_jobs_id_fkey",
		}).onDelete("cascade"),
	],
);

export const grantTemplates = pgTable(
	"grant_templates",
	{
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		grantApplicationId: uuid("grant_application_id").notNull(),
		grantingInstitutionId: uuid("granting_institution_id"),
		grantSections: json("grant_sections").notNull(),
		id: uuid().primaryKey().notNull(),
		ragJobId: uuid("rag_job_id"),
		submissionDate: date("submission_date"),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("ix_grant_templates_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_grant_templates_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_grant_templates_grant_application_id").using(
			"btree",
			table.grantApplicationId.asc().nullsLast().op("uuid_ops"),
		),
		index("ix_grant_templates_rag_job_id").using(
			"btree",
			table.ragJobId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.grantApplicationId],
			foreignColumns: [grantApplications.id],
			name: "grant_templates_grant_application_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.grantingInstitutionId],
			foreignColumns: [grantingInstitutions.id],
			name: "grant_templates_granting_institution_id_fkey",
		}).onDelete("set null"),
		foreignKey({
			columns: [table.ragJobId],
			foreignColumns: [ragGenerationJobs.id],
			name: "grant_templates_rag_job_id_fkey",
		}).onDelete("set null"),
	],
);

export const grantTemplateGenerationJobs = pgTable(
	"grant_template_generation_jobs",
	{
		extractedMetadata: json("extracted_metadata"),
		extractedSections: json("extracted_sections"),
		grantTemplateId: uuid("grant_template_id").notNull(),
		id: uuid().primaryKey().notNull(),
	},
	(table) => [
		uniqueIndex("ix_grant_template_generation_jobs_grant_template_id").using(
			"btree",
			table.grantTemplateId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.grantTemplateId],
			foreignColumns: [grantTemplates.id],
			name: "grant_template_generation_jobs_grant_template_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.id],
			foreignColumns: [ragGenerationJobs.id],
			name: "grant_template_generation_jobs_id_fkey",
		}).onDelete("cascade"),
	],
);

export const editorDocuments = pgTable(
	"editor_documents",
	{
		crdt: text("crdt").$type<Uint8Array>(),
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		documentMetadata: json("document_metadata").default({}),
		grantApplicationId: uuid("grant_application_id"),
		id: uuid().primaryKey().notNull(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("ix_editor_documents_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_editor_documents_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_editor_documents_grant_application_id").using(
			"btree",
			table.grantApplicationId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.grantApplicationId],
			foreignColumns: [grantApplications.id],
			name: "editor_documents_grant_application_id_fkey",
		}).onDelete("set null"),
	],
);

export const grantingInstitutionSources = pgTable(
	"granting_institution_sources",
	{
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		grantingInstitutionId: uuid("granting_institution_id").notNull(),
		ragSourceId: uuid("rag_source_id").notNull(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("ix_granting_institution_sources_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_granting_institution_sources_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		foreignKey({
			columns: [table.grantingInstitutionId],
			foreignColumns: [grantingInstitutions.id],
			name: "granting_institution_sources_granting_institution_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.ragSourceId],
			foreignColumns: [ragSources.id],
			name: "granting_institution_sources_rag_source_id_fkey",
		}).onDelete("cascade"),
		primaryKey({
			columns: [table.ragSourceId, table.grantingInstitutionId],
			name: "granting_institution_sources_pkey",
		}),
	],
);

export const grantApplicationSources = pgTable(
	"grant_application_sources",
	{
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		grantApplicationId: uuid("grant_application_id").notNull(),
		ragSourceId: uuid("rag_source_id").notNull(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("ix_grant_application_sources_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_grant_application_sources_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		foreignKey({
			columns: [table.grantApplicationId],
			foreignColumns: [grantApplications.id],
			name: "grant_application_sources_grant_application_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.ragSourceId],
			foreignColumns: [ragSources.id],
			name: "grant_application_sources_rag_source_id_fkey",
		}).onDelete("cascade"),
		primaryKey({
			columns: [table.grantApplicationId, table.ragSourceId],
			name: "grant_application_sources_pkey",
		}),
	],
);

export const grantTemplateSources = pgTable(
	"grant_template_sources",
	{
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		grantTemplateId: uuid("grant_template_id").notNull(),
		ragSourceId: uuid("rag_source_id").notNull(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("ix_grant_template_sources_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_grant_template_sources_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		foreignKey({
			columns: [table.grantTemplateId],
			foreignColumns: [grantTemplates.id],
			name: "grant_template_sources_grant_template_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.ragSourceId],
			foreignColumns: [ragSources.id],
			name: "grant_template_sources_rag_source_id_fkey",
		}).onDelete("cascade"),
		primaryKey({
			columns: [table.ragSourceId, table.grantTemplateId],
			name: "grant_template_sources_pkey",
		}),
	],
);

export const projectAccess = pgTable(
	"project_access",
	{
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		firebaseUid: varchar("firebase_uid", { length: 128 }).notNull(),
		grantedAt: timestamp("granted_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		organizationId: uuid("organization_id").notNull(),
		projectId: uuid("project_id").notNull(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("idx_project_access_user").using(
			"btree",
			table.firebaseUid.asc().nullsLast().op("text_ops"),
			table.organizationId.asc().nullsLast().op("uuid_ops"),
		),
		index("ix_project_access_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_project_access_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		foreignKey({
			columns: [table.firebaseUid, table.organizationId],
			foreignColumns: [
				organizationUsers.firebaseUid,
				organizationUsers.organizationId,
			],
			name: "project_access_firebase_uid_organization_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_access_project_id_fkey",
		}).onDelete("cascade"),
		primaryKey({
			columns: [table.firebaseUid, table.organizationId, table.projectId],
			name: "project_access_pkey",
		}),
	],
);

export const organizationUsers = pgTable(
	"organization_users",
	{
		createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { mode: "string", withTimezone: true }),
		firebaseUid: varchar("firebase_uid", { length: 128 }).notNull(),
		hasAllProjectsAccess: boolean("has_all_projects_access").notNull(),
		joinedAt: timestamp("joined_at", { mode: "string", withTimezone: true })
			.defaultNow()
			.notNull(),
		organizationId: uuid("organization_id").notNull(),
		role: userroleenum().notNull(),
		updatedAt: timestamp("updated_at", {
			mode: "string",
			withTimezone: true,
		}).notNull(),
	},
	(table) => [
		index("idx_org_user_org_role").using(
			"btree",
			table.organizationId.asc().nullsLast().op("uuid_ops"),
			table.role.asc().nullsLast().op("uuid_ops"),
		),
		index("ix_organization_users_created_at").using(
			"btree",
			table.createdAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_organization_users_deleted_at").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("ix_organization_users_has_all_projects_access").using(
			"btree",
			table.hasAllProjectsAccess.asc().nullsLast().op("bool_ops"),
		),
		foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_users_organization_id_fkey",
		}).onDelete("cascade"),
		primaryKey({
			columns: [table.firebaseUid, table.organizationId],
			name: "organization_users_pkey",
		}),
	],
);
