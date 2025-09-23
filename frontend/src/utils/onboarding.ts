import { log } from "@/utils/logger/client";
import { routes } from "@/utils/navigation";

export function checkProfileAndRedirect(userDisplayName: null | string) {
	log.info("Checking profile completeness", {
		displayNameLength: userDisplayName?.length ?? 0,
		hasDisplayName: Boolean(userDisplayName),
	});

	const isProfileComplete = userDisplayName && userDisplayName.trim().length >= 2;

	if (isProfileComplete) {
		log.info("Profile complete, redirecting to organization");
		globalThis.location.href = routes.organization.root();
	} else {
		log.info("Profile incomplete, redirecting to onboarding");
		globalThis.location.href = routes.onboarding();
	}
}
