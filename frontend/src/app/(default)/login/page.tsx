"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { sendSignInLinkToEmail, type User } from "firebase/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { login } from "@/actions/login";
import { AppButton } from "@/components/app-button";
import { IconGoAhead } from "@/components/icons";
import AppInput from "@/components/input-field";
import { LogoDark } from "@/components/logo";
import { AuthCardHeader } from "@/components/onboarding/auth-card-header";
import { OnboardingGradientBackgroundBottom } from "@/components/onboarding/backgrounds";
import { SeparatorWithText } from "@/components/separator-with-text";
import { SocialSigninButton } from "@/components/social-signin-buttons";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { FIREBASE_LOCAL_STORAGE_KEY } from "@/constants";
import { PagePath } from "@/enums";
import { useUserStore } from "@/stores/user-store";
import { handleGoogleLogin, handleOrcidLogin } from "@/utils/auth-providers";
import { getEnv } from "@/utils/env";
import { getFirebaseAuth } from "@/utils/firebase";

const loginFormSchema = z.object({
	email: z
		.string()
		.min(1, { message: "Please enter your email address." })
		.email({ message: "This email address is not valid." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function Login() {
	const auth = getFirebaseAuth();
	const [isLoading, setIsLoading] = useState(false);
	const [socialSignInError, setSocialSignInError] = useState<null | React.ReactNode | string>(null);
	const { setUser } = useUserStore();

	const handleSocialSignIn = async (
		provider: "google" | "orcid",
		signInMethod: () => Promise<{ idToken: string; isNewUser: boolean; user: User }>,
	) => {
		setIsLoading(true);
		setSocialSignInError(null);

		try {
			const { idToken, isNewUser, user } = await signInMethod();

			if (!isNewUser) {
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
					No account found with this email.{" "}
					<Link
						className="text-primary text-sm hover:underline"
						data-testid="login-no-account-link"
						href="/onboarding"
					>
						Create an account.
					</Link>
				</>
			);
			setSocialSignInError(errorWithLink);
		} catch (error) {
			if (!isRedirectError(error)) {
				toast.error(
					error instanceof Error ? error.message : `${provider.toUpperCase()} sign-in failed due to an error`,
				);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleSignin = async () => {
		await handleSocialSignIn("google", handleGoogleLogin);
	};

	const handleOrcidSignin = async () => {
		await handleSocialSignIn("orcid", handleOrcidLogin);
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
		<div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-white" data-testid="login-page">
			<div className="absolute inset-0 z-0" data-testid="login-background-container">
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
				<OnboardingGradientBackgroundBottom
					aria-hidden="true"
					className="pointer-events-none absolute bottom-0 left-0"
					data-testid="login-background-gradient"
				/>
			</div>

			<header className="z-50 w-full bg-white p-2 shadow-sm md:p-4" data-testid="login-header">
				<div data-testid="login-header-content">
					<LogoDark className="h-12 md:h-14" data-testid="login-logo" height="250" width="250" />
				</div>
			</header>

			<div
				className="text-card-foreground flex size-full grow place-items-center text-center"
				data-testid="login-content-container"
			>
				<div className="z-10 flex w-full flex-col items-center justify-center" data-testid="login-card-wrapper">
					<div className="relative" data-testid="login-card-container">
						<Card
							className="border-primary z-20 mx-auto w-full max-w-md border bg-white px-7 pb-2 pt-7 shadow-md sm:px-9 sm:pb-3 sm:pt-9"
							data-testid="login-card"
						>
							<AuthCardHeader description="Log in to manage your grant workflow" title="Welcome back!" />
							<CardContent data-testid="login-card-content">
								<LoginForm
									isLoading={isLoading}
									onSubmit={({ email }) => handleEmailSignin(email)}
									socialSignInError={socialSignInError}
								/>

								<SeparatorWithText
									className="mb-5"
									data-testid="login-social-separator"
									text={"Or connect with "}
								/>

								<div
									className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2"
									data-testid="login-social-buttons-container"
								>
									<SocialSigninButton
										data-testid="login-google-button"
										isLoading={isLoading}
										onClick={handleGoogleSignin}
										platform="google"
									/>

									<SocialSigninButton
										data-testid="login-orcid-button"
										isLoading={isLoading}
										onClick={handleOrcidSignin}
										platform="orcid"
									/>
								</div>

								<div
									className="flex min-w-max items-center justify-center text-center"
									data-testid="login-create-account-container"
								>
									<span className="text-dark whitespace-nowrap">Don&apos;t have an account yet?</span>{" "}
									<AppButton
										className="text-primary"
										data-testid="login-create-account-link"
										size="sm"
										variant="link"
									>
										<Link data-testid="login-create-account-button-link" href={PagePath.ONBOARDING}>
											Create an Account
										</Link>
									</AppButton>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}

function LoginForm({
	isLoading,
	onSubmit,
	socialSignInError,
}: {
	isLoading: boolean;
	onSubmit: (values: LoginFormValues) => void;
	socialSignInError?: null | React.ReactNode | string;
}) {
	const form = useForm<LoginFormValues>({
		defaultValues: { email: "" },
		mode: "onChange",
		resolver: zodResolver(loginFormSchema),
	});

	return (
		<div data-testid="login-form-container">
			<Form {...form} data-testid="login-form-wrapper">
				<form data-testid="login-form" onSubmit={form.handleSubmit(onSubmit)}>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem data-testid="login-form-email-item">
								<FormControl data-testid="login-form-email-control">
									<AppInput
										autoCapitalize="none"
										autoComplete="email"
										autoCorrect="off"
										className="form-input"
										disabled={isLoading}
										errorMessage={form.formState.errors.email?.message ?? socialSignInError}
										id="email"
										label="Email Address"
										placeholder="name@example.com"
										testId="login-form-email-input"
										type="email"
										{...field}
									/>
								</FormControl>
							</FormItem>
						)}
					/>
					<SubmitButton
						className="mb-8 mt-3 w-full"
						data-testid="login-form-submit-button"
						disabled={!form.formState.isValid || isLoading}
						isLoading={isLoading}
						rightIcon={<IconGoAhead />}
					>
						Login
					</SubmitButton>
				</form>
			</Form>
		</div>
	);
}
