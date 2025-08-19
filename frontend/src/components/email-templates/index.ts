import EmailVerificationTemplate from "./email-verification-template";
import InvitationEmailTemplate from "./invitation-email-template";
import WelcomeEmailTemplate from "./welcome-email-template";
import OrganizationDeletedTemplate from "./organization-deleted-template";
import PersonalAccountDeletionTemplate from "./personal-account-deletion-template";

// The react-email preview server expects a default export
// with the templates as properties.
export default {
	EmailVerificationTemplate,
	InvitationEmailTemplate,
	WelcomeEmailTemplate,
	OrganizationDeletedTemplate,
	PersonalAccountDeletionTemplate,
};

// We can keep the named exports for the rest of the app.
export {
	EmailVerificationTemplate,
	InvitationEmailTemplate,
	WelcomeEmailTemplate,
	OrganizationDeletedTemplate,
	PersonalAccountDeletionTemplate,
};
