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
import { IconSocialGoogle, IconSocialOrcid, IconTick } from "@/components/onboarding/icons";
import { AppButton } from "@/components/app-button";
import Link from "next/link";
import { PatternedBackground } from "@/components/landing-page/backgrounds";
import {
	OnboardingGradientBackgroundBottom,
	OnboardingGradientBackgroundTop,
	StackedHighlight,
} from "@/components/onboarding/backgrounds";
import { LogoDark } from "@/components/logo";

const googleProvider = new GoogleAuthProvider();
const orcidProvider = new OAuthProvider("oidc.orcid");

const benefitItems = [
	{
		description:
			"Get up and running quickly with intelligent tools that simplify the entire grant application process.",
		title: "Start applying faster",
	},
	{
		description:
			"From discovery to submission, GrantFlow.ai supports labs, institutions, and independent researchers across all disciplines.",
		title: "Support every research journey",
	},
	{
		description: "Trusted by leading labs and ambitious researchers working to change the world.",
		title: "Join a growing research community",
	},
];

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
			className="flex size-full min-h-screen place-items-center text-center text-card-foreground relative overflow-hidden bg-white"
			data-testid="login-container"
		>
			<div className="absolute inset-0 flex items-center justify-center">
				<PatternedBackground aria-hidden="true" className="absolute size-full object-cover object-center" />
			</div>

			<OnboardingGradientBackgroundTop
				aria-hidden="true"
				className="absolute top-0 right-0 pointer-events-none"
			/>

			<OnboardingGradientBackgroundBottom
				aria-hidden="true"
				className="absolute bottom-0 left-0 pointer-events-none opacity-0"
			/>

			<div className="z-10 w-full flex flex-col md:flex-row">
				<div className="flex flex-1 justify-end items-center relative">
					<StackedHighlight className="z-10 absolute bottom-0 -right-1/4 pointer-events-none"></StackedHighlight>
					<div className="z-20 w-full lg:w-4/5 xl:w-3/5 text-start">
						<LogoDark
							className={`sm:h-13 lg:h-15 my-1 h-12 w-auto md:my-2 md:h-14 lg:my-4 xl:my-6 xl:h-16`}
							height="auto"
							width="auto"
						/>
						<ul className="space-y-6">
							{benefitItems.map((item, index) => (
								<li className="flex flex-row items-start" key={index}>
									<div className="shrink-0 flex items-center justify-center">
										<IconTick className="mt-1 mr-2" height={14} width={14} />
									</div>
									<div className="">
										<h5 className="font-heading font-semibold mb-2">{item.title}</h5>
										<p className="text-app-gray-600 leading-tight">{item.description}</p>
									</div>
								</li>
							))}
						</ul>
					</div>
				</div>

				<div className="z-20 flex-1 justify-start">
					<Card className="bg-white w-full md:w-4/5 max-w-md mx-auto px-7 pt-7 pb-2 sm:px-9 sm:pt-9 sm:pb-3 border border-primary shadow-md">
						<CardHeader>
							<CardTitle className="text-4xl font-heading font-medium" data-testid="auth-page-title">
								Create your account
							</CardTitle>
							<CardDescription className="text-app-gray-600" data-testid="auth-page-description">
								Get more funding - faster!
							</CardDescription>
						</CardHeader>
						<CardContent>
							<SigninForm
								isLoading={isLoading}
								onSubmit={async ({ email }) => {
									await handleEmailSignin(email);
								}}
							/>
							<SeparatorWithText className="mb-5" text={"Or connect with "} />
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-8">
								<SocialSigninButton
									isLoading={isLoading}
									onClick={async () => {
										await handleGoogleSignin();
									}}
									platform="google"
								/>
								<SocialSigninButton
									isLoading={isLoading}
									onClick={async () => {
										await handleOrcidSignin();
									}}
									platform="orcid"
								/>
							</div>
							<div className="text-center">
								<span className="text-dark">Already have an account?</span>
								<AppButton className="text-primary" size="sm" variant="link">
									<Link href={""}>Login</Link>
								</AppButton>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

export function SocialSigninButton({
	isLoading,
	onClick,
	platform,
}: {
	isLoading: boolean;
	onClick: () => Promise<void>;
	platform: "google" | "orcid";
}) {
	return (
		<AppButton
			className="border-app-gray-400 text-sm font-normal text-dark"
			disabled={isLoading}
			leftIcon={platform === "google" ? <IconSocialGoogle /> : <IconSocialOrcid />}
			onClick={async () => {
				await onClick();
			}}
			size="lg"
			theme="light"
			variant="secondary"
		>
			{platform === "google" ? "Google" : "ORCID"}
		</AppButton>
	);
}
