"use client";

import { useState } from "react";
import { getFirebaseAuth } from "@/utils/firebase";
import { PagePath } from "@/enums";
import { useStore } from "@/store";
import { GoogleAuthProvider, sendSignInLinkToEmail, signInWithPopup } from "firebase/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "gen/ui/card";
import { EmailSigninForm } from "@/components/sign-in/email-signin-form";
import { SeparatorWithText } from "@/components/separator-with-text";
import { SigninWithGoogleButton } from "@/components/sign-in/signin-with-google-button";
import { getEnv } from "@/utils/env";
import { FIREBASE_LOCAL_STORAGE_KEY } from "@/constants";
import { toast } from "sonner";
import { login } from "@/app/actions/api";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { logError } from "@/utils/logging";

const googleProvider = new GoogleAuthProvider();

export default function SignIn() {
	const { setUser } = useStore();
	const auth = getFirebaseAuth();
	const [isLoading, setIsLoading] = useState(false);

	const handleGoogleSignin = async () => {
		setIsLoading(true);

		try {
			const cred = await signInWithPopup(auth, googleProvider);
			setUser(cred.user);
			const idToken = await cred.user.getIdToken();
			await login(idToken);
		} catch (error) {
			if (!isRedirectError(error)) {
				logError({ error, identifier: "handleGoogleSignin" });
				toast.error("Sign-in failed due to an error");
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleEmailSignin = async (email: string) => {
		setIsLoading(true);

		const url = new URL(PagePath.FINISH_EMAIL_SIGNIN, getEnv().NEXT_PUBLIC_SITE_URL).toString();

		try {
			await sendSignInLinkToEmail(auth, email, {
				url,
				handleCodeInApp: true,
			});
			globalThis.localStorage.setItem(FIREBASE_LOCAL_STORAGE_KEY, email);
			toast.success("An email has been sent to your mailbox with a sign-in link.\n\nPlease check your inbox.");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to send sign-in email");
		} finally {
			setIsLoading(false);
		}
	};

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
						isLoading={isLoading}
					/>
					<SeparatorWithText text={"Or sign in with"} />
					<SigninWithGoogleButton
						onClick={async () => {
							await handleGoogleSignin();
						}}
						isLoading={isLoading}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
