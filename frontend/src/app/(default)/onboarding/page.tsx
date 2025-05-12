"use client";

import { login } from "@/actions/login";
import { SeparatorWithText } from "@/components/separator-with-text";
import { SigninForm } from "@/components/onboarding/signin-form";
import { FIREBASE_LOCAL_STORAGE_KEY } from "@/constants";
import { PagePath } from "@/enums";
import { getEnv } from "@/utils/env";
import { getFirebaseAuth } from "@/utils/firebase";
import { logError } from "@/utils/logging";
import { GoogleAuthProvider, OAuthProvider, sendSignInLinkToEmail, signInWithPopup } from "firebase/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconSocialGoogle, IconSocialOrcid } from "@/components/onboarding/icons";

const googleProvider = new GoogleAuthProvider();
const orcidProvider = new OAuthProvider("oidc.orcid");

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

	const handleOrcidSignin = async () => {
		setIsLoading(true);

		try {
			orcidProvider.setCustomParameters({
				prompt: "login",
			});

			const cred = await signInWithPopup(auth, orcidProvider);
			const idToken = await cred.user.getIdToken();
			await login(idToken);
			toast.success("You are registered with us!!");
		} catch (error) {
			if (!isRedirectError(error)) {
				logError({ error, identifier: "handleOrcidSignin" });
				toast.error("ORCID sign-in failed due to an error");
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div
			className="flex size-full min-h-screen place-items-center text-center text-card-foreground"
			data-testid="login-container"
		>
			<Card className="mx-auto max-w-md p-7 sm:p-9">
				<CardHeader>
					<CardTitle className="text-4xl font-heading font-medium" data-testid="auth-page-title">
						Create your account
					</CardTitle>
					<CardDescription className="text-app-gray-600" data-testid="auth-page-description">
						Get more funding - faster!
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<SigninForm
						isLoading={isLoading}
						onSubmit={async ({ email }) => {
							await handleEmailSignin(email);
						}}
					/>
					<SeparatorWithText text={"Or connect with"} />
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<SigninWithGoogleButton
							isLoading={isLoading}
							onClick={async () => {
								await handleGoogleSignin();
							}}
						/>
						<SigninWithOrcidButton
							isLoading={isLoading}
							onClick={async () => {
								await handleOrcidSignin();
							}}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export function SigninWithGoogleButton({ isLoading, onClick }: { isLoading: boolean; onClick: () => Promise<void> }) {
	return (
		<section className="flex flex-col gap-2" data-testid="oauth-signin-form">
			<Button
				className="w-full rounded border p-1"
				data-testid="oauth-signin-form-google-button"
				disabled={isLoading}
				onClick={async () => {
					await onClick();
				}}
				variant="secondary"
			>
				<p className="flex items-center justify-center gap-3">
					<span className="text-md bold" data-testid="oauth-signin-form-google-text">
						Sign in with Google
					</span>
					<span data-testid="oauth-signin-form-google-icon">
						<IconSocialGoogle className="size-4" />
					</span>
				</p>
			</Button>
		</section>
	);
}

function SigninWithOrcidButton({ isLoading, onClick }: { isLoading: boolean; onClick: () => Promise<void> }) {
	return (
		<Button
			className="flex w-full items-center justify-center gap-2 bg-[#A6CE39] text-white hover:bg-[#8CB82B] font-button"
			data-testid="orcid-signin-button"
			disabled={isLoading}
			onClick={onClick}
			variant="outline"
		>
			{isLoading ? (
				<div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
			) : (
				<>
					<IconSocialOrcid height={20} width={20} />
					<span>ORCID</span>
				</>
			)}
		</Button>
	);
}
