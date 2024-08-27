"use client";

import { getAuthConfig } from "@/config/auth";
import { ApiPath } from "@/config/enums";
import { getBrowserClient } from "@/utils/supabase/client";
import { urlWithHost } from "@/utils/url";
import type { Provider } from "@supabase/supabase-js";
import { Button } from "gen/ui/button";
import { useState } from "react";

const authConfig = getAuthConfig();

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
		<section data-testid="oauth-signin-form" className="flex flex-col gap-2">
			{authConfig.oauthProviders.map((provider) => (
				<Button
					key={provider.id}
					variant="secondary"
					className="w-full p-1 border rounded"
					data-testid={`oauth-signin-form-${provider.id}-button`}
					onClick={() => {
						void handleSubmit(provider.id);
					}}
				>
					<p className="flex justify-center items-center gap-3">
						<span data-testid={`oauth-signin-form-${provider.id}-text`} className="text-md bold">
							Sign in with {provider.displayName}
						</span>
						<span data-testid={`oauth-signin-form-${provider.id}-icon`}>{<provider.icon className="h-4 w-4" />}</span>
					</p>
				</Button>
			))}
			{error && (
				<div data-testid="oauth-signin-error" className="text-destructive">
					{error}
				</div>
			)}
		</section>
	);
}
