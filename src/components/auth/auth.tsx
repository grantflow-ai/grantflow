"use client";

import { Separator } from "@/components/separator";
import { getAuthConfig } from "@/config/auth";
import { Button, type ButtonProps } from "gen/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "gen/ui/card";
import { type Dispatch, type FC, type SetStateAction, Suspense, lazy, useMemo, useState } from "react";

const PasswordSigninForm = lazy(async () => {
	const { PasswordSigninForm } = await import("@/components/auth/password-signin-form");
	return { default: PasswordSigninForm };
});

const EmailSigninForm = lazy(async () => {
	const { EmailSigninForm } = await import("@/components/auth/email-signin-form");
	return { default: EmailSigninForm };
});

const PhoneSigninForm = lazy(async () => {
	const { PhoneSigninForm } = await import("@/components/auth/phone-signin-form");
	return { default: PhoneSigninForm };
});

const SignupForm = lazy(async () => {
	const { SignupForm } = await import("@/components/auth/signup-form");
	return { default: SignupForm };
});

const ForgotPasswordForm = lazy(async () => {
	const { ForgotPasswordForm } = await import("@/components/auth/forgot-password-form");
	return { default: ForgotPasswordForm };
});

const OauthSigninForm = lazy(async () => {
	const { OauthSigninForm } = await import("@/components/auth/oauth-signin-form");
	return { default: OauthSigninForm };
});

const authConfig = getAuthConfig();

type AuthForm = "passwordSignin" | "emailSignin" | "phoneSignin" | "signup" | "forgotPassword";

const titleMap: Record<AuthForm, string> = {
	passwordSignin: "Sign in",
	emailSignin: "Sign in",
	phoneSignin: "Sign in",
	signup: "Sign up",
	forgotPassword: "Forgot password",
};

const LinkButton: FC<
	{
		formName: AuthForm;
		text: string;
		onClick: Dispatch<SetStateAction<AuthForm>>;
	} & Partial<Omit<ButtonProps, "onClick">>
> = ({
	formName,
	text,
	onClick,
	className,
	variant = "link",
	size = "sm",
}: {
	formName: AuthForm;
	text: string;
	onClick: Dispatch<SetStateAction<AuthForm>>;
} & Partial<Omit<ButtonProps, "onClick">>) => (
	<Button
		className={className}
		data-testid={`${formName}-button`}
		onClick={() => {
			onClick(formName);
		}}
		size={size}
		variant={variant}
		aria-label={`Switch to ${text}`}
	>
		{text}
	</Button>
);

const createFormConfig = (currentForm: AuthForm) => {
	const config = {
		showSignupLink: currentForm !== "signup" && (authConfig.emailSignin || authConfig.phoneSignin),
		showForgotPasswordLink: currentForm === "passwordSignin" && authConfig.passwordSignin,
		showEmailSigninLink: currentForm !== "emailSignin" && authConfig.emailSignin,
		showPhoneSigninLink: currentForm !== "phoneSignin" && authConfig.phoneSignin,
		showPasswordSigninLink: currentForm !== "passwordSignin" && authConfig.passwordSignin,
		showOauthSignin: authConfig.oauthSignin && authConfig.oauthProviders.length,
		showSigninLinkContainers: false,
	};

	config.showSigninLinkContainers =
		config.showEmailSigninLink || config.showPhoneSigninLink || config.showPasswordSigninLink;

	return config;
};

export function Auth() {
	const [currentForm, setCurrentForm] = useState<AuthForm>(
		authConfig.emailSignin
			? "emailSignin"
			: // eslint-disable-next-line unicorn/no-nested-ternary
				authConfig.phoneSignin
				? "phoneSignin"
				: "passwordSignin",
	);
	const formConfig = useMemo(() => createFormConfig(currentForm), [currentForm]);

	const formMap = useMemo(
		() => ({
			emailSignin: EmailSigninForm,
			phoneSignin: PhoneSigninForm,
			forgotPassword: ForgotPasswordForm,
			passwordSignin: PasswordSigninForm,
			signup: SignupForm,
		}),
		[],
	);

	const Component = formMap[currentForm];
	const title = titleMap[currentForm];

	return (
		<Card className="w-1/3 p-4" data-testid="card-container">
			<CardHeader data-testid="card-header">
				<CardTitle data-testid="card-title" className="text-center">
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent data-testid="card-content">
				<Suspense fallback={<div aria-live="polite">Loading form...</div>}>
					<Component />
				</Suspense>
				{formConfig.showSignupLink && (
					<div className="flex justify-end">
						<LinkButton
							formName="signup"
							text="Don't have an account? Signup!"
							onClick={setCurrentForm}
							className="text-right text-sm font-light block underline"
						/>
					</div>
				)}
				{formConfig.showForgotPasswordLink && (
					<LinkButton
						formName="forgotPassword"
						text="Forgot Password?"
						onClick={setCurrentForm}
						className="text-sm font-light block underline"
					/>
				)}
			</CardContent>
			<CardFooter>
				{(formConfig.showSigninLinkContainers || formConfig.showOauthSignin) && (
					<nav className="w-full">
						<Separator text="Or sign in with" />
						{formConfig.showSigninLinkContainers && (
							<section className="flex flex-col gap-2 mb-2">
								{formConfig.showPhoneSigninLink && (
									<LinkButton
										formName="phoneSignin"
										text={`Sign in with ${authConfig.phoneSigninType} OTP`}
										onClick={setCurrentForm}
										variant="secondary"
										className="w-full p-1 border rounded"
									/>
								)}
								{formConfig.showPasswordSigninLink && (
									<LinkButton
										formName="passwordSignin"
										text="Sign in with Email and Password"
										onClick={setCurrentForm}
										variant="secondary"
										className="w-full p-1 border rounded"
									/>
								)}
								{formConfig.showEmailSigninLink && (
									<LinkButton
										formName="emailSignin"
										text={`Sign in with Email ${authConfig.emailSigninType}`}
										onClick={setCurrentForm}
										variant="secondary"
										className="w-full p-1 border rounded"
									/>
								)}
							</section>
						)}
						{formConfig.showOauthSignin && (
							<Suspense fallback={<div aria-live="polite">Loading OAuth options...</div>}>
								<OauthSigninForm />
							</Suspense>
						)}
					</nav>
				)}
			</CardFooter>
		</Card>
	);
}
