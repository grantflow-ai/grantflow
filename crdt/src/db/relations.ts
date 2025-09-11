import { relations } from "drizzle-orm/relations";
import {
	editorDocuments,
	generationNotifications,
	grantApplicationGenerationJobs,
	grantApplicationSources,
	grantApplications,
	grantingInstitutionSources,
	grantingInstitutions,
	grantTemplateGenerationJobs,
	grantTemplateSources,
	grantTemplates,
	notifications,
	organizationAuditLogs,
	organizationInvitations,
	organizations,
	organizationUsers,
	projectAccess,
	projects,
	ragFiles,
	ragGenerationJobs,
	ragSources,
	ragUrls,
	textVectors,
} from "./schema";

export const generationNotificationsRelations = relations(generationNotifications, ({ one }) => ({
	ragGenerationJob: one(ragGenerationJobs, {
		fields: [generationNotifications.ragJobId],
		references: [ragGenerationJobs.id],
	}),
}));

export const ragGenerationJobsRelations = relations(ragGenerationJobs, ({ many }) => ({
	generationNotifications: many(generationNotifications),
	grantApplicationGenerationJobs: many(grantApplicationGenerationJobs),
	grantApplications: many(grantApplications),
	grantTemplateGenerationJobs: many(grantTemplateGenerationJobs),
	grantTemplates: many(grantTemplates),
}));

export const organizationAuditLogsRelations = relations(organizationAuditLogs, ({ one }) => ({
	organization: one(organizations, {
		fields: [organizationAuditLogs.organizationId],
		references: [organizations.id],
	}),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
	notifications: many(notifications),
	organizationAuditLogs: many(organizationAuditLogs),
	organizationInvitations: many(organizationInvitations),
	organizationUsers: many(organizationUsers),
	projects: many(projects),
}));

export const organizationInvitationsRelations = relations(organizationInvitations, ({ one }) => ({
	organization: one(organizations, {
		fields: [organizationInvitations.organizationId],
		references: [organizations.id],
	}),
}));

export const projectsRelations = relations(projects, ({ many, one }) => ({
	grantApplications: many(grantApplications),
	notifications: many(notifications),
	organization: one(organizations, {
		fields: [projects.organizationId],
		references: [organizations.id],
	}),
	projectAccesses: many(projectAccess),
}));

export const ragFilesRelations = relations(ragFiles, ({ one }) => ({
	ragSource: one(ragSources, {
		fields: [ragFiles.id],
		references: [ragSources.id],
	}),
}));

export const ragSourcesRelations = relations(ragSources, ({ many }) => ({
	grantApplicationSources: many(grantApplicationSources),
	grantingInstitutionSources: many(grantingInstitutionSources),
	grantTemplateSources: many(grantTemplateSources),
	ragFiles: many(ragFiles),
	ragUrls: many(ragUrls),
	textVectors: many(textVectors),
}));

export const ragUrlsRelations = relations(ragUrls, ({ one }) => ({
	ragSource: one(ragSources, {
		fields: [ragUrls.id],
		references: [ragSources.id],
	}),
}));

export const textVectorsRelations = relations(textVectors, ({ one }) => ({
	ragSource: one(ragSources, {
		fields: [textVectors.ragSourceId],
		references: [ragSources.id],
	}),
}));

export const grantApplicationsRelations = relations(grantApplications, ({ many, one }) => ({
	editorDocuments: many(editorDocuments),
	grantApplication: one(grantApplications, {
		fields: [grantApplications.parentId],
		references: [grantApplications.id],
		relationName: "grantApplications_parentId_grantApplications_id",
	}),
	grantApplicationGenerationJobs: many(grantApplicationGenerationJobs),
	grantApplicationSources: many(grantApplicationSources),
	grantApplications: many(grantApplications, {
		relationName: "grantApplications_parentId_grantApplications_id",
	}),
	grantTemplates: many(grantTemplates),
	project: one(projects, {
		fields: [grantApplications.projectId],
		references: [projects.id],
	}),
	ragGenerationJob: one(ragGenerationJobs, {
		fields: [grantApplications.ragJobId],
		references: [ragGenerationJobs.id],
	}),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
	organization: one(organizations, {
		fields: [notifications.organizationId],
		references: [organizations.id],
	}),
	project: one(projects, {
		fields: [notifications.projectId],
		references: [projects.id],
	}),
}));

export const grantApplicationGenerationJobsRelations = relations(grantApplicationGenerationJobs, ({ one }) => ({
	grantApplication: one(grantApplications, {
		fields: [grantApplicationGenerationJobs.grantApplicationId],
		references: [grantApplications.id],
	}),
	ragGenerationJob: one(ragGenerationJobs, {
		fields: [grantApplicationGenerationJobs.id],
		references: [ragGenerationJobs.id],
	}),
}));

export const grantTemplatesRelations = relations(grantTemplates, ({ many, one }) => ({
	grantApplication: one(grantApplications, {
		fields: [grantTemplates.grantApplicationId],
		references: [grantApplications.id],
	}),
	grantingInstitution: one(grantingInstitutions, {
		fields: [grantTemplates.grantingInstitutionId],
		references: [grantingInstitutions.id],
	}),
	grantTemplateGenerationJobs: many(grantTemplateGenerationJobs),
	grantTemplateSources: many(grantTemplateSources),
	ragGenerationJob: one(ragGenerationJobs, {
		fields: [grantTemplates.ragJobId],
		references: [ragGenerationJobs.id],
	}),
}));

export const grantingInstitutionsRelations = relations(grantingInstitutions, ({ many }) => ({
	grantingInstitutionSources: many(grantingInstitutionSources),
	grantTemplates: many(grantTemplates),
}));

export const grantTemplateGenerationJobsRelations = relations(grantTemplateGenerationJobs, ({ one }) => ({
	grantTemplate: one(grantTemplates, {
		fields: [grantTemplateGenerationJobs.grantTemplateId],
		references: [grantTemplates.id],
	}),
	ragGenerationJob: one(ragGenerationJobs, {
		fields: [grantTemplateGenerationJobs.id],
		references: [ragGenerationJobs.id],
	}),
}));

export const editorDocumentsRelations = relations(editorDocuments, ({ one }) => ({
	grantApplication: one(grantApplications, {
		fields: [editorDocuments.grantApplicationId],
		references: [grantApplications.id],
	}),
}));

export const grantingInstitutionSourcesRelations = relations(grantingInstitutionSources, ({ one }) => ({
	grantingInstitution: one(grantingInstitutions, {
		fields: [grantingInstitutionSources.grantingInstitutionId],
		references: [grantingInstitutions.id],
	}),
	ragSource: one(ragSources, {
		fields: [grantingInstitutionSources.ragSourceId],
		references: [ragSources.id],
	}),
}));

export const grantApplicationSourcesRelations = relations(grantApplicationSources, ({ one }) => ({
	grantApplication: one(grantApplications, {
		fields: [grantApplicationSources.grantApplicationId],
		references: [grantApplications.id],
	}),
	ragSource: one(ragSources, {
		fields: [grantApplicationSources.ragSourceId],
		references: [ragSources.id],
	}),
}));

export const grantTemplateSourcesRelations = relations(grantTemplateSources, ({ one }) => ({
	grantTemplate: one(grantTemplates, {
		fields: [grantTemplateSources.grantTemplateId],
		references: [grantTemplates.id],
	}),
	ragSource: one(ragSources, {
		fields: [grantTemplateSources.ragSourceId],
		references: [ragSources.id],
	}),
}));

export const projectAccessRelations = relations(projectAccess, ({ one }) => ({
	organizationUser: one(organizationUsers, {
		fields: [projectAccess.firebaseUid],
		references: [organizationUsers.firebaseUid],
	}),
	project: one(projects, {
		fields: [projectAccess.projectId],
		references: [projects.id],
	}),
}));

export const organizationUsersRelations = relations(organizationUsers, ({ many, one }) => ({
	organization: one(organizations, {
		fields: [organizationUsers.organizationId],
		references: [organizations.id],
	}),
	projectAccesses: many(projectAccess),
}));
