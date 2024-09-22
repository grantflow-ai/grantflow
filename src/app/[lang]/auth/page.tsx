import { EmailSigninForm } from "@/components/auth/email-signin-form";
import { OauthSigninForm } from "@/components/auth/oauth-signin-form";
import { Separator } from "@/components/separator";
import { PagePath } from "@/config/enums";
import { type SupportedLocale, getLocale } from "@/i18n";
import { getServerClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "gen/ui/card";
import { redirect } from "next/navigation";

export default async function AuthPage({
	params: { lang },
}: {
	params: { lang: SupportedLocale };
}) {
	const supabase = getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
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
					<Separator text={locale.authPage.oAuthSeperator} />
					<OauthSigninForm />
				</CardContent>
			</Card>
		</div>
	);
}
