"use client";

import { sendSignInLinkToEmail, type User } from "firebase/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { login } from "@/actions/login";
import { AppButton } from "@/components/app-button";
import { LogoDark } from "@/components/logo";
import { AuthCardHeader } from "@/components/onboarding/auth-card-header";
import {
	OnboardingGradientBackgroundBottom,
	OnboardingGradientBackgroundTop,
	StackedHighlight,
} from "@/components/onboarding/backgrounds";
import { BenefitsList } from "@/components/onboarding/onboarding-benefits";
import { SigninForm } from "@/components/onboarding/signin-form";
import { SeparatorWithText } from "@/components/separator-with-text";
import { SocialSigninButton } from "@/components/social-signin-buttons";
import { Card, CardContent } from "@/components/ui/card";
import { FIREBASE_LOCAL_STORAGE_KEY } from "@/constants";
import { PagePath } from "@/enums";
import { useUserStore } from "@/stores/user-store";
import { handleGoogleSignup, handleOrcidSignup } from "@/utils/auth-providers";
import { getEnv } from "@/utils/env";
import { getFirebaseAuth } from "@/utils/firebase";

export default function SignIn() {
	const auth = getFirebaseAuth();
	const [isLoading, setIsLoading] = useState(false);
	const [socialSignInError, setSocialSignInError] = useState<null | React.ReactNode | string>(null);
	const { setUser } = useUserStore();

	const handleSocialSignUp = async (
		provider: "google" | "orcid",
		signupMethod: () => Promise<{ idToken: string; isNewUser: boolean; user: User }>,
	) => {
		setIsLoading(true);
		setSocialSignInError(null);

		try {
			const { idToken, isNewUser, user } = await signupMethod();

			if (isNewUser) {
				toast.success("Account created successfully!");

				// Store user info in the user store
				setUser({
					displayName: user.displayName,
					email: user.email,
					emailVerified: user.emailVerified,
					photoURL: user.photoURL,
					providerId: user.providerData[0]?.providerId,
					uid: user.uid,
				});

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
			className="text-card-foreground relative flex size-full min-h-screen place-items-center overflow-hidden bg-white p-2 text-center"
			data-testid="login-container"
		>
			<div className="absolute inset-0 flex items-center justify-center">
				<Image
					alt="background"
					aria-hidden="true"
					className="size-full object-none xl:object-cover"
					height={0}
					priority
					src="/assets/landing-bg-pattern.svg"
					style={{ height: "auto", width: "100%" }}
					width={0}
				/>
			</div>

			<OnboardingGradientBackgroundTop
				aria-hidden="true"
				className="pointer-events-none absolute right-0 top-0 opacity-0 lg:opacity-100"
			/>

			<OnboardingGradientBackgroundBottom
				aria-hidden="true"
				className="pointer-events-none absolute bottom-0 left-0 opacity-100 lg:opacity-0"
			/>

			<div className="z-10 flex w-full flex-col lg:flex-row">
				<div className="relative my-8 flex flex-1 items-center justify-center lg:my-0 lg:justify-end">
					<div className="relative z-20 w-4/5 text-start xl:w-3/5">
						<StackedHighlight className="pointer-events-none absolute -bottom-1/2 -z-10 lg:-right-1/3" />
						<LogoDark
							className={"sm:h-13 lg:h-15 my-1 h-12 w-auto md:my-2 md:h-14 lg:my-4 xl:my-6 xl:h-16"}
						/>
						<BenefitsList />
					</div>
				</div>

				<div className="z-20 flex-1 justify-start">
					<Card className="border-primary mx-auto w-full max-w-md border bg-white px-7 pb-2 pt-7 shadow-md sm:px-9 sm:pb-3 sm:pt-9 md:w-4/5">
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
							<div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
