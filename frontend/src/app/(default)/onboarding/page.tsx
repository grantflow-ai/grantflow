"use client";

import { login } from "@/actions/login";
import { SeparatorWithText } from "@/components/separator-with-text";
import { SigninForm } from "@/components/onboarding/signin-form";
import { FIREBASE_LOCAL_STORAGE_KEY } from "@/constants";
import { PagePath } from "@/enums";
import { getEnv } from "@/utils/env";
import { getFirebaseAuth } from "@/utils/firebase";
import { sendSignInLinkToEmail, User } from "firebase/auth";
import { Card, CardContent } from "@/components/ui/card";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useState } from "react";
import { toast } from "sonner";
import { AppButton } from "@/components/app-button";
import Link from "next/link";
import { PatternedBackground } from "@/components/landing-page/backgrounds";
import {
	OnboardingGradientBackgroundBottom,
	OnboardingGradientBackgroundTop,
	StackedHighlight,
} from "@/components/onboarding/backgrounds";
import { SocialSigninButton } from "@/components/social-signin-buttons";
import { handleGoogleSignup, handleOrcidSignup } from "@/utils/auth-providers";
import { AuthCardHeader } from "@/components/onboarding/auth-card-header";
import { LogoDark } from "@/components/logo";
import { BenefitsList } from "@/components/onboarding/onboarding-benefits";

export default function SignIn() {
	const auth = getFirebaseAuth();
	const [isLoading, setIsLoading] = useState(false);
	const [socialSignInError, setSocialSignInError] = useState<null | React.ReactNode | string>(null);

	const handleSocialSignUp = async (
		provider: "google" | "orcid",
		signupMethod: () => Promise<{ idToken: string; isNewUser: boolean; user: User }>,
	) => {
		setIsLoading(true);
		setSocialSignInError(null);

		try {
			const { idToken, isNewUser } = await signupMethod();

			if (isNewUser) {
				toast.success("Account created successfully!");
				await login(idToken);
				return;
			}

			const errorWithLink = (
				<>
					This email is already registered.{" "}
					<Link className="text-primary text-sm hover:underline" href="/login">
						Log in instead.
					</Link>
				</>
			);
			setSocialSignInError(errorWithLink);
		} catch (error) {
			if (!isRedirectError(error)) {
				toast.error(
					error instanceof Error ? error.message : `${provider.toUpperCase()} sign-up failed due to an error`,
				);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleSignin = async () => {
		await handleSocialSignUp("google", handleGoogleSignup);
	};

	const handleOrcidSignin = async () => {
		await handleSocialSignUp("orcid", handleOrcidSignup);
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
		<div
			className="flex size-full min-h-screen place-items-center text-center text-card-foreground p-2 relative overflow-hidden bg-white"
			data-testid="login-container"
		>
			<div className="absolute inset-0 flex items-center justify-center">
				<PatternedBackground aria-hidden="true" className="absolute size-full object-cover object-center" />
			</div>

			<OnboardingGradientBackgroundTop
				aria-hidden="true"
				className="absolute top-0 right-0 pointer-events-none opacity-0 lg:opacity-100"
			/>

			<OnboardingGradientBackgroundBottom
				aria-hidden="true"
				className="absolute bottom-0 left-0 pointer-events-none opacity-100 lg:opacity-0"
			/>

			<div className="z-10 w-full flex flex-col lg:flex-row">
				<div className="flex flex-1 justify-center lg:justify-end items-center relative my-8 lg:my-0">
					<div className="relative z-20 w-4/5 xl:w-3/5 text-start">
						<StackedHighlight className="-z-10 absolute -bottom-1/2 lg:-right-1/3 pointer-events-none" />
						<LogoDark
							className={`sm:h-13 lg:h-15 my-1 h-12 w-auto md:my-2 md:h-14 lg:my-4 xl:my-6 xl:h-16`}
							height="auto"
							width="auto"
						/>
						<BenefitsList />
					</div>
				</div>

				<div className="z-20 flex-1 justify-start">
					<Card className="bg-white w-full md:w-4/5 max-w-md mx-auto px-7 pt-7 pb-2 sm:px-9 sm:pt-9 sm:pb-3 border border-primary shadow-md">
						<AuthCardHeader description="Get more funding - faster!" title="Create your account" />
						<CardContent>
							<SigninForm
								isLoading={isLoading}
								onSubmit={async ({ email }) => {
									await handleEmailSignin(email);
								}}
								socialSignInError={socialSignInError}
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
									<Link href={PagePath.LOGIN}>Login</Link>
								</AppButton>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
