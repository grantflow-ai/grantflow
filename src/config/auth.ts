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
