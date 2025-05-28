import { FirebaseError } from "firebase/app";
import { getAdditionalUserInfo, GoogleAuthProvider, OAuthProvider, signInWithPopup, User } from "firebase/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { getFirebaseAuth } from "@/utils/firebase";
import { logError } from "@/utils/logging";

const auth = getFirebaseAuth();
const googleProvider = new GoogleAuthProvider();
const orcidProvider = new OAuthProvider("oidc.orcid");

orcidProvider.setCustomParameters({
	prompt: "login",
});

const handleFirebaseAuthError = (error: unknown, identifier: string): never => {
	if (isRedirectError(error)) {
		throw error;
	}

	const firebaseError = error as FirebaseError;

	switch (firebaseError.code) {
		case "auth/account-exists-with-different-credential": {
			throw new Error("This email is already associated with another account");
		}

		case "auth/cancelled-popup-request": {
			throw new Error("Authentication cancelled");
		}

		case "auth/network-request-failed": {
			throw new Error("Network error. Please check your connection and try again");
		}

		case "auth/operation-not-allowed": {
			logError({ error, identifier });
			throw new Error("Sign-in is not enabled for this application");
		}

		case "auth/popup-blocked": {
			throw new Error("Sign-in popup was blocked by your browser");
		}

		case "auth/popup-closed-by-user": {
			throw new Error("Sign-in popup was closed");
		}

		case "auth/user-disabled": {
			throw new Error("This account has been disabled");
		}

		case "auth/timeout": {
			throw new Error("The authentication process timed out. Please try again");
		}

		default: {
			logError({ error, identifier });
			throw new Error("Sign-in failed. Please try again later");
		}
	}
};

const handleAuth = async (
	provider: GoogleAuthProvider | OAuthProvider,
	identifier: string,
): Promise<{
	idToken: string;
	isNewUser: boolean;
	user: User;
}> => {
	try {
		const result = await signInWithPopup(auth, provider);

		const additionalInfo = getAdditionalUserInfo(result);
		const isNewUser = additionalInfo?.isNewUser ?? false;

		const idToken = await result.user.getIdToken();
		return {
			idToken,
			isNewUser,
			user: result.user,
		};
	} catch (error) {
		logError({ error, identifier });
		return handleFirebaseAuthError(error, identifier);
	}
};

const handleGoogleAuth = async (): Promise<{
	idToken: string;
	isNewUser: boolean;
	user: User;
}> => {
	return handleAuth(googleProvider, "handleGoogleAuth");
};

const handleGoogleSignup = async (): Promise<{
	idToken: string;
	isNewUser: boolean;
	user: User;
}> => {
	return handleGoogleAuth();
};

const handleGoogleLogin = async (): Promise<{
	idToken: string;
	isNewUser: boolean;
	user: User;
}> => {
	return handleGoogleAuth();
};

const handleOrcidAuth = async (): Promise<{
	idToken: string;
	isNewUser: boolean;
	user: User;
}> => {
	return handleAuth(orcidProvider, "handleOrcidAuth");
};

const handleOrcidSignup = async (): Promise<{
	idToken: string;
	isNewUser: boolean;
	user: User;
}> => {
	return handleOrcidAuth();
};

const handleOrcidLogin = async (): Promise<{
	idToken: string;
	isNewUser: boolean;
	user: User;
}> => {
	return handleOrcidAuth();
};

export { handleGoogleLogin, handleGoogleSignup, handleOrcidLogin, handleOrcidSignup };
