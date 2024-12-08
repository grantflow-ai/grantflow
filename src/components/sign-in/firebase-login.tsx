import { Auth, GoogleAuthProvider, sendSignInLinkToEmail, signInWithPopup } from "@firebase/auth";
import { useRouter } from "next/navigation";
import { PagePath } from "@/enums";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "gen/ui/card";
import { EmailSigninForm } from "@/components/sign-in/email-signin-form";
import { SeparatorWithText } from "@/components/separator-with-text";
import { SigninWithGoogleButton } from "@/components/sign-in/signin-with-google-button";
import { getEnv } from "@/utils/env";
import { FIREBASE_COOKIE_NAME, FIREBASE_LOCAL_STORAGE_KEY, ONE_HOUR_IN_SECONDS } from "@/constants";
import { useCookies } from "react-cookie";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const googleProvider = new GoogleAuthProvider();

/**
 * Firebase authentication component that handles both email and Google sign-in methods.
 * Manages authentication state, loading states, and redirects for authenticated users.
 *
 * @param setLoading - Function to update the global loading state
 * @param auth - Firebase Auth instance
 */
export function FirebaseLogin({ setLoading, auth }: { setLoading: (value: boolean) => void; auth: Auth }) {
	const router = useRouter();
	const [idToken, setIdToken] = useState<string | null>(null);
	const [{ [FIREBASE_COOKIE_NAME]: cookie }, setCookies] = useCookies([FIREBASE_COOKIE_NAME]);
	const [isInitializing, setIsInitializing] = useState(true);

	useEffect(() => {
		if (cookie) {
			router.replace(PagePath.WORKSPACES);
			return;
		}
		setIsInitializing(false);
	}, [cookie, router]);

	useEffect(() => {
		if (!cookie && idToken) {
			setCookies(FIREBASE_COOKIE_NAME, idToken, {
				maxAge: ONE_HOUR_IN_SECONDS * 24,
				secure: true,
				sameSite: "strict",
				httpOnly: true, // this is important!
			});
		}
	}, [cookie, idToken, setCookies]);

	/**
	 * Handles Google sign-in authentication flow
	 * Opens a popup for Google auth and manages the resulting token
	 */
	const handleGoogleSignin = async () => {
		setLoading(true);

		try {
			const cred = await signInWithPopup(auth, googleProvider);
			const idToken = await cred.user.getIdToken();
			setIdToken(idToken);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to sign in with Google");
		} finally {
			setLoading(false);
		}
	};

	/**
	 * Handles email sign-in initialization
	 * Sends a sign-in link to the provided email address
	 *
	 * @param email - User's email address
	 */
	const handleEmailSignin = async (email: string) => {
		setLoading(true);

		const url = new URL(PagePath.FINISH_EMAIL_SIGNIN, getEnv().NEXT_PUBLIC_SITE_URL).toString();

		try {
			await sendSignInLinkToEmail(auth, email, {
				url,
				handleCodeInApp: true,
			});
			globalThis.localStorage.setItem(FIREBASE_LOCAL_STORAGE_KEY, email);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to send sign-in email");
		} finally {
			setLoading(false);
		}
	};

	if (isInitializing) {
		return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
	}

	if (cookie) {
		return null;
	}

	return (
		<div className="container mx-auto px-4 py-8 md:py-16" data-testid="firebase-login-container">
			<Card className="max-w-md mx-auto">
				<CardHeader>
					<CardTitle className="text-2xl font-bold text-center" data-testid="auth-page-title">
						Welcome to GrantFlow.AI
					</CardTitle>
					<CardDescription className="text-center" data-testid="auth-page-description">
						Sign in to get started
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<EmailSigninForm
						onSubmit={async ({ email }) => {
							await handleEmailSignin(email);
						}}
					/>
					<SeparatorWithText text={"Or sign in with"} />
					<SigninWithGoogleButton
						onClick={async () => {
							await handleGoogleSignin();
						}}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
