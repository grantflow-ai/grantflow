"use client";

import { EmailSigninForm } from "@/components/auth/email-signin-form";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { OauthSigninForm } from "@/components/auth/oauth-signin-form";
import { PasswordSigninForm } from "@/components/auth/password-signin-form";
import { SignupForm } from "@/components/auth/signup-form";
import { Separator } from "@/components/separator";
import {
	AUTH_METHOD_EMAIL_SIGNIN,
	AUTH_METHOD_OAUTH_SIGNIN,
	AUTH_METHOD_PASSWORD_SIGNIN,
	getEnabledAuthMethods,
} from "@/config/auth";
import { Button } from "gen/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
import { type FC, useState } from "react";

type AuthForm = "password-signin" | "email-signin" | "signup" | "forgot-password";

const formMap: Record<AuthForm, FC> = {
	"password-signin": PasswordSigninForm,
	"email-signin": EmailSigninForm,
	signup: SignupForm,
	"forgot-password": ForgotPasswordForm,
};

const titleMap: Record<AuthForm, string> = {
	"password-signin": "Sign in",
	"email-signin": "Sign in",
	signup: "Sign up",
	"forgot-password": "Forgot password",
};

export function Auth() {
	const enabledAuthMethods = getEnabledAuthMethods();

	const [currentForm, setCurrentForm] = useState<AuthForm>(
		enabledAuthMethods.has(AUTH_METHOD_EMAIL_SIGNIN) ? "email-signin" : "password-signin",
	);

	const Component = formMap[currentForm];
	const title = titleMap[currentForm];

	return (
		<div className="flex justify-center" data-testid="auth-view">
			<Card className="w-96" data-testid="card-container">
				<CardHeader className="pb-0" data-testid="card-header">
					<CardTitle data-testid="card-title">{title}</CardTitle>
				</CardHeader>
				<CardContent data-testid="card-content">
					<Component />
					{enabledAuthMethods.has(AUTH_METHOD_PASSWORD_SIGNIN) && currentForm !== "signup" && (
						<Button
							className="text-sm font-light block"
							data-testid="signup-button"
							onClick={() => {
								setCurrentForm("signup");
							}}
							size="sm"
							variant="link"
						>
							Don't have an account? Sign up
						</Button>
					)}
					{currentForm === "password-signin" && (
						<Button
							className="text-sm font-light block"
							data-testid="forgot-password-button"
							onClick={() => {
								setCurrentForm("forgot-password");
							}}
							size="sm"
							variant="link"
						>
							Forgot password?
						</Button>
					)}
					{currentForm === "password-signin" && enabledAuthMethods.has(AUTH_METHOD_EMAIL_SIGNIN) && (
						<Button
							className="text-sm font-light block"
							data-testid="email-signin-button"
							onClick={() => {
								setCurrentForm("email-signin");
							}}
							size="sm"
							variant="link"
						>
							Sign in with email link
						</Button>
					)}
					{["email-signin", "signup"].includes(currentForm) && enabledAuthMethods.has(AUTH_METHOD_PASSWORD_SIGNIN) && (
						<Button
							className="text-sm font-light block"
							data-testid="password-signin-button"
							onClick={() => {
								setCurrentForm("password-signin");
							}}
							size="sm"
							variant="link"
						>
							Sign in with password
						</Button>
					)}
					{enabledAuthMethods.has(AUTH_METHOD_OAUTH_SIGNIN) && (
						<div data-testid="oauth-signin">
							<Separator text="Or sign in with" />
							<OauthSigninForm />
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
