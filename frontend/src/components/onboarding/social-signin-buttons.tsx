import { AppButton } from "@/components/app/buttons/app-button";
import { IconSocialGoogle, IconSocialOrcid } from "./icons";

export function SocialSigninButton({
	isDisabled,
	isLoading,
	onClick,
	platform,
	...props
}: {
	isDisabled?: boolean;
	isLoading: boolean;
	onClick: () => Promise<void>;
	platform: "google" | "orcid";
}) {
	return (
		<AppButton
			className="border-app-gray-400 text-dark text-sm font-normal hover:border-ring hover:before:border-ring hover:before:border-1 active:border-primary active:before:border-primary active:before:border-1"
			disabled={isLoading || isDisabled}
			leftIcon={platform === "google" ? <IconSocialGoogle /> : <IconSocialOrcid />}
			onClick={async () => {
				await onClick();
			}}
			size="lg"
			theme="light"
			variant="secondary"
			{...props}
		>
			{platform === "google" ? "Google" : "ORCID"}
		</AppButton>
	);
}
