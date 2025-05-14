import { FirebaseError } from "firebase/app";
import { getAdditionalUserInfo, GoogleAuthProvider, signInWithPopup, User } from "firebase/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getFirebaseAuth } from "./firebase";
import { logError } from "./logging";

const auth = getFirebaseAuth();
const googleProvider = new GoogleAuthProvider();

const handleGoogleAuth = async (): Promise<{
	idToken: string;
	isNewUser: boolean;
	user: User;
}> => {
	try {
		const result = await signInWithPopup(auth, googleProvider);

		const additionalInfo = getAdditionalUserInfo(result);
		const isNewUser = additionalInfo?.isNewUser ?? false;

		const credential = GoogleAuthProvider.credentialFromResult(result);
		const idToken = credential?.idToken ?? "";

		return {
			idToken,
			isNewUser,
			user: result.user,
		};
	} catch (error) {
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
				logError({ error, identifier: "handleGoogleAuth" });
				throw new Error("Google sign-in is not enabled for this application");
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

			default: {
				logError({ error, identifier: "handleGoogleAuth" });
				throw new Error("Sign-in failed. Please try again later");
			}
		}
	}
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

export { handleGoogleLogin, handleGoogleSignup };
