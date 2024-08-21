import { AuthMethod } from "@/config/enums";

const enabledAuthMethods = new Set<AuthMethod>(Object.values(AuthMethod));

/**
 * Retrieves a set of the enabled signing methods.
 *
 * @returns A set of enabled signin methods.
 */
export function getEnabledAuthMethods(): typeof enabledAuthMethods {
	return enabledAuthMethods;
}
