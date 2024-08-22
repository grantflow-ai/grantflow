"use client";

import { Separator } from "@/components/separator";
import { AuthMethod } from "@/config/enums";
import { Button } from "gen/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
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

type AuthForm = "passwordSignin" | "emailSignin" | "phoneSignin" | "signup" | "forgotPassword";

const LinkButton: FC<{
	formName: AuthForm;
	text: string;
	onClick: Dispatch<SetStateAction<AuthForm>>;
}> = ({
	formName,
	text,
	onClick,
}: {
	formName: AuthForm;
	text: string;
	onClick: Dispatch<SetStateAction<AuthForm>>;
}) => (
	<Button
		className="text-sm font-light block"
		data-testid={`${formName}-button`}
		onClick={() => {
			onClick(formName);
		}}
		size="sm"
		variant="link"
		aria-label={`Switch to ${text}`}
	>
		{text}
	</Button>
);

export function Auth({
	enabledAuthMethods,
}: {
	enabledAuthMethods: Set<AuthMethod>;
}) {
	const [currentForm, setCurrentForm] = useState<AuthForm>(
		enabledAuthMethods.has(AuthMethod.EMAIL_SIGNIN)
			? "emailSignin"
			: // eslint-disable-next-line unicorn/no-nested-ternary
				enabledAuthMethods.has(AuthMethod.PHONE_SIGNIN)
				? "phoneSignin"
				: "passwordSignin",
	);

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

	const titleMap = useMemo(
		() => ({
			passwordSignin: "Sign in",
			emailSignin: "Sign in",
			phoneSignin: "Sign in",
			signup: "Sign up",
			forgotPassword: "Forgot password",
		}),
		[],
	);

	const Component = formMap[currentForm];
	const title = titleMap[currentForm];

	const showSignupLink =
		currentForm !== "signup" &&
		(enabledAuthMethods.has(AuthMethod.EMAIL_SIGNIN) || enabledAuthMethods.has(AuthMethod.PHONE_SIGNIN));
	const showForgotPasswordLink = currentForm === "passwordSignin" && enabledAuthMethods.has(AuthMethod.PASSWORD_SIGNIN);
	const showEmailSigninLink = currentForm !== "emailSignin" && enabledAuthMethods.has(AuthMethod.EMAIL_SIGNIN);
	const showPhoneSigninLink = currentForm !== "phoneSignin" && enabledAuthMethods.has(AuthMethod.PHONE_SIGNIN);
	const showPasswordSigninLink = currentForm !== "passwordSignin" && enabledAuthMethods.has(AuthMethod.PASSWORD_SIGNIN);
	const showOauthSignin = enabledAuthMethods.has(AuthMethod.OAUTH_SIGNIN);

	return (
		<div className="flex justify-center" data-testid="auth-view" role="region">
			<Card className="w-96" data-testid="card-container">
				<CardHeader className="pb-0" data-testid="card-header">
					<CardTitle data-testid="card-title">{title}</CardTitle>
				</CardHeader>
				<CardContent data-testid="card-content">
					<Suspense fallback={<div aria-live="polite">Loading form...</div>}>
						<Component />
					</Suspense>
					<nav>
						{showSignupLink && <LinkButton formName="signup" text="Sign up" onClick={setCurrentForm} />}
						{showForgotPasswordLink && (
							<LinkButton formName="forgotPassword" text="Forgot password?" onClick={setCurrentForm} />
						)}
						{showEmailSigninLink && (
							<LinkButton formName="emailSignin" text="Sign in with email" onClick={setCurrentForm} />
						)}
						{showPhoneSigninLink && (
							<LinkButton formName="phoneSignin" text="Sign in with phone" onClick={setCurrentForm} />
						)}
						{showPasswordSigninLink && (
							<LinkButton formName="passwordSignin" text="Sign in with password" onClick={setCurrentForm} />
						)}
					</nav>
					{showOauthSignin && (
						<div data-testid="oauth-signin">
							<Separator text="Or sign in with" />
							<Suspense fallback={<div aria-live="polite">Loading OAuth options...</div>}>
								<OauthSigninForm />
							</Suspense>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
