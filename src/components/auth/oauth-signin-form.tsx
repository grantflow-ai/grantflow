"use client";

import { ApiPath } from "@/config/enums";
import { getBrowserClient } from "@/utils/supabase/client";
import { urlWithHost } from "@/utils/url";
import { SiGithub, SiGoogle } from "@icons-pack/react-simple-icons";
import type { Provider } from "@supabase/supabase-js";
import { Button } from "gen/ui/button";
import { type ReactElement, useState } from "react";

interface OAuthProvider {
	id: Provider;
	displayName: string;
	icon: ReactElement;
}

const oAuthProviders: OAuthProvider[] = [
	{
		id: "google",
		displayName: "Google",
		icon: <SiGoogle className="h-5 w-5" />,
	},
	{
		id: "github",
		displayName: "GitHub",
		icon: <SiGithub className="h-5 w-5" />,
	},
];

export function OauthSigninForm() {
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (providerName: Provider) => {
		try {
			const supabase = getBrowserClient();

			await supabase.auth.signInWithOAuth({
				provider: providerName,
				options: {
					redirectTo: urlWithHost(ApiPath.CALLBACK_OPENID),
				},
			});
		} catch (error) {
			setError((error as Error).message);
		}
	};

	return (
		<div data-testid="oauth-signin-form">
			{oAuthProviders.map((provider) => (
				<Button
					key={provider.id}
					className="w-full mb-2"
					data-testid={`oauth-signin-form-${provider.id}-button`}
					onClick={() => {
						void handleSubmit(provider.id);
					}}
				>
					<span className="mr-2" data-testid={`oauth-signin-form-${provider.id}-icon`}>
						{provider.icon}
					</span>
					<span data-testid={`oauth-signin-form-${provider.id}-text`}>{provider.displayName}</span>
				</Button>
			))}
			{error && (
				<div data-testid="oauth-signin-error" className="text-destructive">
					{error}
				</div>
			)}
		</div>
	);
}
