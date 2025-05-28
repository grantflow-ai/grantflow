import { AppButton } from "@/components/app-button";
import { IconSocialGoogle, IconSocialOrcid } from "@/components/onboarding/icons";

export function SocialSigninButton({
	isLoading,
	onClick,
	platform,
}: {
	isLoading: boolean;
	onClick: () => Promise<void>;
	platform: "google" | "orcid";
}) {
	return (
		<AppButton
			className="border-app-gray-400 text-dark text-sm font-normal"
			disabled={isLoading}
			leftIcon={platform === "google" ? <IconSocialGoogle /> : <IconSocialOrcid />}
			onClick={async () => {
				await onClick();
			}}
			size="lg"
			theme="light"
			variant="secondary"
		>
			{platform === "google" ? "Google" : "ORCID"}
		</AppButton>
	);
}
