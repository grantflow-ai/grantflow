import { EmailSigninType, PhoneSigninType } from "@/config/enums";
import { SiGithub, SiGoogle } from "@icons-pack/react-simple-icons";
import type { Provider } from "@supabase/supabase-js";
import type { ForwardRefExoticComponent, SVGProps } from "react";

interface OAuthProvider {
	id: Provider;
	displayName: string;
	icon: ForwardRefExoticComponent<SVGProps<SVGSVGElement>>;
}

export const oAuthProviders = [
	{
		id: "google",
		displayName: "Google",
		icon: SiGoogle,
	},
	{
		id: "github",
		displayName: "GitHub",
		icon: SiGithub,
	},
] satisfies OAuthProvider[];

export interface AuthConfig {
	emailSignin: boolean;
	emailSigninType: EmailSigninType;
	phoneSignin: boolean;
	phoneSigninType: PhoneSigninType;
	passwordSignin: boolean;
	oauthSignin: boolean;
	oauthProviders: OAuthProvider[];
}

export const getAuthConfig = (): Readonly<AuthConfig> =>
	Object.freeze({
		emailSignin: true,
		emailSigninType: EmailSigninType.OTP,
		phoneSignin: true,
		phoneSigninType: PhoneSigninType.SMS,
		passwordSignin: true,
		oauthSignin: true,
		oauthProviders: oAuthProviders,
	});
