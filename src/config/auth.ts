import { SiGoogle } from "@icons-pack/react-simple-icons";
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
] satisfies OAuthProvider[];
