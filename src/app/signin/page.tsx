import { EmailSigninForm } from "@/components/auth/email-signin-form";
import { SeparatorWithText } from "@/components/separator-with-text";
import { PagePath } from "@/enums";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "gen/ui/card";
import { redirect } from "next/navigation";
import { auth } from "@/auth/helpers";
import { SigninWithGoogleButton } from "@/components/auth/signin-with-google-button";

export default async function SigninPage() {
	const session = await auth();

	if (session?.user) {
		return redirect(PagePath.ROOT);
	}

	return (
		<div className="container mx-auto px-4 py-8 md:py-16" data-testid="auth-page">
			<Card className="max-w-md mx-auto">
				<CardHeader>
					<CardTitle className="text-2xl font-bold text-center" data-testid="auth-page-title">
						Welcome to GrantFlow.AI
					</CardTitle>
					<CardDescription className="text-center" data-testid="auth-page-description">
						Sign in to get started
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<EmailSigninForm />
					<SeparatorWithText text={"Or sign in with"} />
					<SigninWithGoogleButton />
				</CardContent>
			</Card>
		</div>
	);
}
