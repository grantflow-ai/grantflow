import { EmailSigninForm } from "@/components/auth/email-signin-form";
import { SeparatorWithText } from "@/components/separator-with-text";
import { PagePath } from "@/enums";
import { getLocale, type SupportedLocale } from "@/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "gen/ui/card";
import { redirect } from "next/navigation";
import { Button } from "gen/ui/button";
import { auth, signIn } from "@/auth";
import { SiGoogle } from "@icons-pack/react-simple-icons";

export default async function SigninPage({ params: { lang } }: { params: { lang: SupportedLocale } }) {
	const session = await auth();

	if (session?.user) {
		return redirect(PagePath.ROOT);
	}

	const locale = await getLocale(lang);

	return (
		<div className="container mx-auto px-4 py-8 md:py-16" data-testid="auth-page">
			<Card className="max-w-md mx-auto">
				<CardHeader>
					<CardTitle className="text-2xl font-bold text-center" data-testid="auth-page-title">
						{locale.authPage.title}
					</CardTitle>
					<CardDescription className="text-center" data-testid="auth-page-description">
						{locale.authPage.description}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<EmailSigninForm locales={locale} />
					<SeparatorWithText text={locale.authPage.oAuthSeperator} />
					<section data-testid="oauth-signin-form" className="flex flex-col gap-2">
						<Button
							variant="secondary"
							className="w-full p-1 border rounded"
							data-testid="oauth-signin-form-google-button"
							onClick={async () => {
								await signIn("google");
							}}
						>
							<p className="flex justify-center items-center gap-3">
								<span data-testid="oauth-signin-form-google-text" className="text-md bold">
									Sign in with Google
								</span>
								<span data-testid="oauth-signin-form-google-icon">
									<SiGoogle className="h-4 w-4" />
								</span>
							</p>
						</Button>
					</section>
				</CardContent>
			</Card>
		</div>
	);
}
