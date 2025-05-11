"use client";

import { login } from "@/actions/login";
import { SeparatorWithText } from "@/components/separator-with-text";
import { EmailSigninForm } from "@/components/sign-in/email-signin-form";
import { SigninWithGoogleButton } from "@/components/sign-in/signin-with-google-button";
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

const googleProvider = new GoogleAuthProvider();
const OrcidProviderId = "oidc.orcid";

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
			const orcidProvider = new OAuthProvider(OrcidProviderId);

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
		<div className="container mx-auto px-4 py-8 md:py-16" data-testid="firebase-login-container">
			<Card className="mx-auto max-w-md">
				<CardHeader>
					<CardTitle className="text-center text-2xl font-bold" data-testid="auth-page-title">
						Create your account
					</CardTitle>
					<CardDescription className="text-center" data-testid="auth-page-description">
						Get more funding - faster!
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<EmailSigninForm
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

function SigninWithOrcidButton({ isLoading, onClick }: { isLoading: boolean; onClick: () => Promise<void> }) {
	return (
		<Button
			className="flex w-full items-center justify-center gap-2 bg-[#A6CE39] text-white hover:bg-[#8CB82B]"
			data-testid="orcid-signin-button"
			disabled={isLoading}
			onClick={onClick}
			variant="outline"
		>
			{isLoading ? (
				<div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
			) : (
				<>
					<svg fill="none" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
						<path
							d="M128 256C198.692 256 256 198.692 256 128C256 57.3075 198.692 0 128 0C57.3075 0 0 57.3075 0 128C0 198.692 57.3075 256 128 256Z"
							fill="white"
						/>
						<path d="M86.2676 79.4297H74.0977V176.703H86.2676V79.4297Z" fill="#A6CE39" />
						<path
							d="M80.1816 66.8516C85.1758 66.8516 89.2285 62.7988 89.2285 57.8047C89.2285 52.8105 85.1758 48.7578 80.1816 48.7578C75.1875 48.7578 71.1348 52.8105 71.1348 57.8047C71.1348 62.7988 75.1875 66.8516 80.1816 66.8516Z"
							fill="#A6CE39"
						/>
						<path
							d="M127.051 79.4297H100.488V176.703H112.658V97.1484H127.051C141.582 97.1484 149.561 106.934 149.561 119.658C149.561 132.383 141.582 142.168 127.051 142.168H119.072V159.886H127.051C151.973 159.886 161.758 139.473 161.758 119.658C161.758 99.8438 151.973 79.4297 127.051 79.4297Z"
							fill="#A6CE39"
						/>
						<path d="M180.879 79.4297H168.709V176.703H180.879V79.4297Z" fill="#A6CE39" />
						<path
							d="M174.793 66.8516C179.787 66.8516 183.84 62.7988 183.84 57.8047C183.84 52.8105 179.787 48.7578 174.793 48.7578C169.799 48.7578 165.746 52.8105 165.746 57.8047C165.746 62.7988 169.799 66.8516 174.793 66.8516Z"
							fill="#A6CE39"
						/>
					</svg>
					<span>Sign in with ORCID</span>
				</>
			)}
		</Button>
	);
}
