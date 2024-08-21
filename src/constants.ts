export enum ErrorType {
	INVALID_EMAIL = "INVALID_EMAIL",
	PASSWORD_MISMATCH = "PASSWORD_MISMATCH",
	PASSWORD_UPDATE_FAILED = "PASSWORD_UPDATE_FAILED",
	SIGN_IN_FAILED = "SIGN_IN_FAILED",
	UNEXPECTED_ERROR = "UNEXPECTED_ERROR",
	NO_CUSTOMER = "NO_CUSTOMER",
	AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
}

export enum InfoMessage {
	EMAIL_OTP_SENT = "EMAIL_OTP_SENT",
	PASSWORD_RESET_LINK_SENT = "PASSWORD_RESET_LINK_SENT",
	SIGN_IN_SUCCESSFUL = "SIGN_IN_SUCCESSFUL",
	SUCCESS = "SUCCESS",
	CONFIRMATION_EMAIL_SENT = "CONFIRMATION_EMAIL_SENT",
}

export const INVALID_EMAIL = "Invalid email address.";
export const PASSWORD_MISMATCH = "Passwords do not match. Please try again.";
export const PASSWORD_UPDATE_FAILED = "Your password could not be updated. Please try again.";
export const SIGNIN_FAILED = "Sign in failed. Please check your credentials and try again.";
export const UNEXPECTED_ERROR = "An unexpected error occurred.";
export const NO_CUSTOMER = "Could not find customer.";
export const AUTHENTICATION_FAILED = "Authentication failed.";
export const EMAIL_OTP_SENT = "Please check your email for a magic link. You may now close this tab.";
export const PASSWORD_RESET_LINK_SENT =
	"Please check your email for a password reset link. You may now close this tab.";
export const SIGN_IN_SUCCESFUL = "You are now signed in.";
export const SUCCESS = "Success!";
export const CONFIRMATION_EMAILS_SENT = "Confirmation email sent. Please check your mailbox.";
