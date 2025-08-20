import EmailVerificationTemplate from "./email-verification-template";
import InvitationEmailTemplate from "./invitation-email-template";
import OrganizationDeletedTemplate from "./organization-deleted-template";
import PersonalAccountDeletionTemplate from "./personal-account-deletion-template";
import WelcomeEmailTemplate from "./welcome-email-template";

// The react-email preview server expects a default export
// with the templates as properties.
export default {
	EmailVerificationTemplate,
	InvitationEmailTemplate,
	OrganizationDeletedTemplate,
	PersonalAccountDeletionTemplate,
	WelcomeEmailTemplate,
};

// We can keep the named exports for the rest of the app.

export { default as EmailVerificationTemplate } from "./email-verification-template";
export { default as InvitationEmailTemplate } from "./invitation-email-template";
export { default as OrganizationDeletedTemplate } from "./organization-deleted-template";
export { default as PersonalAccountDeletionTemplate } from "./personal-account-deletion-template";
export { default as WelcomeEmailTemplate } from "./welcome-email-template";
