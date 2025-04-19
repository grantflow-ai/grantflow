"use client";

import { login } from "@/actions/api";
import { SeparatorWithText } from "@/components/separator-with-text";
import { EmailSigninForm } from "@/components/sign-in/email-signin-form";
import { SigninWithGoogleButton } from "@/components/sign-in/signin-with-google-button";
import { FIREBASE_LOCAL_STORAGE_KEY } from "@/constants";
import { PagePath } from "@/enums";
import { getEnv } from "@/utils/env";
import { getFirebaseAuth } from "@/utils/firebase";
import { logError } from "@/utils/logging";
import { GoogleAuthProvider, sendSignInLinkToEmail, signInWithPopup } from "firebase/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useState } from "react";
import { toast } from "sonner";

const googleProvider = new GoogleAuthProvider();

export default function SignIn() {
	const auth = getFirebaseAuth();
	const [isLoading, setIsLoading] = useState(false);

	const handleGoogleSignin = async () => {
		setIsLoading(true);

		try {
			const cred = await signInWithPopup(auth, googleProvider);
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
				handleCodeInApp: true,
				url,
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
			<Card className="mx-auto max-w-md">
				<CardHeader>
					<CardTitle className="text-center text-2xl font-bold" data-testid="auth-page-title">
						Welcome to GrantFlow.AI
					</CardTitle>
					<CardDescription className="text-center" data-testid="auth-page-description">
						Sign in to get started
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<EmailSigninForm
						isLoading={isLoading}
						onSubmit={async ({ email }) => {
							await handleEmailSignin(email);
						}}
					/>
					<SeparatorWithText text={"Or sign in with"} />
					<SigninWithGoogleButton
						isLoading={isLoading}
						onClick={async () => {
							await handleGoogleSignin();
						}}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
