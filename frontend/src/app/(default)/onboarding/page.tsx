"use client";

import { sendSignInLinkToEmail, type User } from "firebase/auth";
import { motion } from "framer-motion";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { login } from "@/actions/login";
import { AppCard, AppCardContent } from "@/components/app/app-card";
import { AppButton } from "@/components/app/buttons/app-button";
import { SeparatorWithText } from "@/components/app/display/separator-with-text";
import { LogoDark } from "@/components/branding/icons/logo";
import { CookieConsentProvider } from "@/components/cookie-consent";
import {
	AuthCardHeader,
	BenefitsList,
	OnboardingGradientBackgroundBottom,
	OnboardingGradientBackgroundTop,
	SigninForm,
	SocialSigninButton,
	StackedHighlight,
} from "@/components/onboarding";
import { FIREBASE_LOCAL_STORAGE_KEY } from "@/constants";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { useUserStore } from "@/stores/user-store";
import { handleGoogleSignup, handleOrcidSignup } from "@/utils/auth-providers";
import { getEnv } from "@/utils/env";
import { convertFirebaseUser, getFirebaseAuth } from "@/utils/firebase";
import { routes } from "@/utils/navigation";

export default function SignIn() {
	const auth = getFirebaseAuth();
	const [isLoading, setIsLoading] = useState(false);
	const [socialSignInError, setSocialSignInError] = useState<null | React.ReactNode | string>(null);
	const { setUser } = useUserStore();
	const [submittedEmail, setSubmittedEmail] = useState("");
	const { hasConsent } = useCookieConsent();

	const handleSocialSignUp = async (
		provider: "google" | "orcid",
		signupMethod: () => Promise<{ idToken: string; isNewUser: boolean; user: User }>,
	) => {
		if (!hasConsent) {
			toast.error("Please accept cookies to continue with registration");
			return;
		}

		setSocialSignInError(null);

		try {
			const { idToken, isNewUser, user } = await signupMethod();

			if (isNewUser) {
				toast.success("Account created successfully!");

				setUser(convertFirebaseUser(user));

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
	const handleBack = () => {
		setIsLoading(false);
	};
	const handleOrcidSignin = async () => {
		await handleSocialSignUp("orcid", handleOrcidSignup);
	};

	const handleEmailSignin = async (email: string) => {
		if (!hasConsent) {
			toast.error("Please accept cookies to continue with registration");
			return;
		}

		setIsLoading(true);

		const url = new URL(routes.finishEmailSignin(), getEnv().NEXT_PUBLIC_SITE_URL).toString();

		try {
			await sendSignInLinkToEmail(auth, email, {
				handleCodeInApp: true,
				url,
			});
			globalThis.localStorage.setItem(FIREBASE_LOCAL_STORAGE_KEY, email);
			toast.success("An email has been sent to your mailbox with a sign-in link.\n\nPlease check your inbox.");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to send sign-in email");
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

				<div className="relative z-20 flex-1 justify-start overflow-hidden">
					<motion.div
						animate={{
							opacity: isLoading ? 0 : 1,
							pointerEvents: isLoading ? "none" : "auto",
						}}
						transition={{ duration: 0.3, ease: "easeInOut" }}
					>
						<AppCard className="border-primary mx-auto w-full max-w-md border bg-white px-7 pb-2 pt-7 shadow-md sm:px-9 sm:pb-3 sm:pt-9 md:w-4/5">
							<AuthCardHeader description="Get more funding - faster!" title="Create your account" />
							<AppCardContent>
								<SigninForm
									isDisabled={!hasConsent}
									isLoading={isLoading}
									onSubmit={async ({ email }) => {
										setSubmittedEmail(email);
										await handleEmailSignin(email);
									}}
									socialSignInError={socialSignInError}
								/>
								<SeparatorWithText className="mb-5" text={"Or connect with "} />
								<div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
									<SocialSigninButton
										isDisabled={!hasConsent}
										isLoading={isLoading}
										onClick={async () => {
											await handleGoogleSignin();
										}}
										platform="google"
									/>
									<SocialSigninButton
										isDisabled={!hasConsent}
										isLoading={isLoading}
										onClick={async () => {
											await handleOrcidSignin();
										}}
										platform="orcid"
									/>
								</div>
								<div className="text-center">
									<span className="text-dark">Already have an account?</span>
									<AppButton
										className="text-primary"
										data-testid="login-link-button"
										size="sm"
										variant="link"
									>
										<Link href={routes.login()}>Login</Link>
									</AppButton>
								</div>
							</AppCardContent>
						</AppCard>
					</motion.div>
					<motion.div
						animate={{
							opacity: isLoading ? 1 : 0,
							pointerEvents: isLoading ? "auto" : "none",
						}}
						className="absolute inset-0 flex items-center justify-center"
						initial={{ opacity: 0 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
					>
						<AppCard className="border-primary mx-auto w-full max-w-md border p-14 shadow-md md:w-4/5">
							<AuthCardHeader description="" title="Verify Your Email " />
							<AppCardContent className="flex flex-col gap-12 p-0">
								<div className="flex flex-col gap-6">
									<p className="text-left font-normal text-sm leading-5 text-app-black">
										We&apos;ve sent a verification link to{" "}
										<span className="text-primary">{submittedEmail}</span>. Please check your inbox
										and click the link to activate your GrantFlow account.
									</p>
									<article className="flex gap-1 rounded border border-app-slate-blue bg-light-gray p-2">
										<div className="size-5 flex-shrink-0 mt-0.5">
											<AlertCircle className="text-gray-700 size-4" />
										</div>
										<p className="text-sm font-normal text-left leading-[18px] text-app-black font-body">
											Didn&apos;t receive the email ? <br /> Check your spam folder or{" "}
											<span className="text-primary">Resend the verification email</span>.
										</p>
									</article>
								</div>

								<div className="flex items-start">
									<AppButton
										className="px-3 py-1 text-base font-normal"
										onClick={handleBack}
										variant="secondary"
									>
										<ChevronLeft />
										Edit email address
									</AppButton>
								</div>
							</AppCardContent>
						</AppCard>
					</motion.div>
				</div>
			</div>
			<CookieConsentProvider />
		</div>
	);
}
