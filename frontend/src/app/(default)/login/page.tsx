"use client";

import { login } from "@/actions/login";
import { FIREBASE_LOCAL_STORAGE_KEY } from "@/constants";
import { PagePath } from "@/enums";
import { getEnv } from "@/utils/env";
import { getFirebaseAuth } from "@/utils/firebase";
import { logError } from "@/utils/logging";
import { getAdditionalUserInfo, OAuthProvider, sendSignInLinkToEmail, signInWithPopup } from "firebase/auth";
import { useState } from "react";
import { toast } from "sonner";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppInput } from "@/components/input-field";
import { SubmitButton } from "@/components/submit-button";
import { PatternedBackground } from "@/components/landing-page/backgrounds";
import { OnboardingGradientBackgroundBottom } from "@/components/onboarding/backgrounds";
import { IconGoAhead } from "@/components/icons";
import { LogoDark } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";
import { SeparatorWithText } from "@/components/separator-with-text";
import { SocialSigninButton } from "@/components/social-signin-buttons";
import { AppButton } from "@/components/app-button";
import Link from "next/link";
import { handleGoogleLogin } from "@/utils/google-signin";
import { AuthCardHeader } from "@/components/onboarding/auth-card-header";

const loginFormSchema = z.object({
	email: z
		.string()
		.min(1, { message: "Please enter your email address." })
		.email({ message: "This email address is not valid." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const orcidProvider = new OAuthProvider("oidc.orcid");

export default function Login() {
	const auth = getFirebaseAuth();
	const [isLoading, setIsLoading] = useState(false);
	const [googleSignInError, setGoogleSignInError] = useState<null | React.ReactNode | string>(null);

	const handleGoogleSignin = async () => {
		setIsLoading(true);
		setGoogleSignInError(null);

		try {
			const { idToken, isNewUser } = await handleGoogleLogin();

			if (isNewUser) {
				const errorWithLink = (
					<>
						No account found with this email.{" "}
						<Link className="text-primary text-sm hover:underline" href="/onboarding">
							Create an account.
						</Link>
					</>
				);
				setGoogleSignInError(errorWithLink);
			} else {
				toast.success("Welcome back!");
				await login(idToken);
			}
		} catch (error) {
			if (!isRedirectError(error)) {
				toast.error(error instanceof Error ? error.message : "Failed to sign in");
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

			const additionalUserInfo = getAdditionalUserInfo(cred);
			const isNewUser = additionalUserInfo?.isNewUser ?? false;

			if (isNewUser) {
				const errorWithLink = (
					<>
						No account found with this email.{" "}
						<Link className="text-primary text-sm hover:underline" href="/onboarding">
							Create an account.
						</Link>
					</>
				);
				setGoogleSignInError(errorWithLink);
			} else {
				const idToken = await cred.user.getIdToken();
				await login(idToken);
			}
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
		<div className="flex flex-col min-h-screen bg-white relative overflow-hidden" data-testid="login-container">
			<div className="absolute inset-0 z-0">
				<PatternedBackground aria-hidden="true" className="absolute size-full object-cover object-center" />
				<OnboardingGradientBackgroundBottom
					aria-hidden="true"
					className="absolute bottom-0 left-0 pointer-events-none"
				/>
			</div>

			<header className="w-full bg-white p-2 md:p-4 shadow-sm z-50">
				<LogoDark className="h-12 md:h-14" height="250" width="250" />
			</header>

			<div
				className="grow flex size-full place-items-center text-center text-card-foreground"
				data-testid="login-container"
			>
				<div className="z-10 w-full flex flex-col items-center justify-center">
					<div className="relative">
						<Card className="z-20 bg-white w-full max-w-md mx-auto px-7 pt-7 pb-2 sm:px-9 sm:pt-9 sm:pb-3 border border-primary shadow-md">
							<AuthCardHeader description="Log in to manage your grant workflow" title="Welcome back!" />
							<CardContent>
								<LoginForm
									googleSignInError={googleSignInError}
									isLoading={isLoading}
									onSubmit={({ email }) => handleEmailSignin(email)}
								/>

								<SeparatorWithText className="mb-5" text={"Or connect with "} />

								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-8">
									<SocialSigninButton
										isLoading={isLoading}
										onClick={handleGoogleSignin}
										platform="google"
									/>

									<SocialSigninButton
										isLoading={isLoading}
										onClick={handleOrcidSignin}
										platform="orcid"
									/>
								</div>

								<div className="text-center flex items-center justify-center min-w-max">
									<span className="text-dark whitespace-nowrap">Don&apos;t have an account yet?</span>
									<AppButton className="text-primary" size="sm" variant="link">
										<Link href={PagePath.ONBOARDING}>Create an Account</Link>
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
	googleSignInError,
	isLoading,
	onSubmit,
}: {
	googleSignInError?: null | React.ReactNode | string | undefined;
	isLoading: boolean;
	onSubmit: (values: LoginFormValues) => void;
}) {
	const form = useForm<LoginFormValues>({
		defaultValues: { email: "" },
		mode: "onChange",
		resolver: zodResolver(loginFormSchema),
	});

	return (
		<div data-testid="login-form-container">
			<Form {...form}>
				<form data-testid="login-form" onSubmit={form.handleSubmit(onSubmit)}>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<AppInput
										autoCapitalize="none"
										autoComplete="email"
										autoCorrect="off"
										className="form-input"
										data-testid="login-form-email-input"
										disabled={isLoading}
										errorMessage={form.formState.errors.email?.message ?? googleSignInError}
										id="email"
										label="Email Address"
										placeholder="name@example.com"
										type="email"
										{...field}
									/>
								</FormControl>
							</FormItem>
						)}
					/>
					<SubmitButton
						canBeDisabled={false}
						className="mt-3 mb-8 w-full"
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
