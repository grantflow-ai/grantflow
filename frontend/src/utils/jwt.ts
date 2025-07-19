import type { UserRoleEnum } from "@/types/api-types";

export interface JWTClaims {
	exp?: number;
	iat: number;
	jti: string;
	organization_id?: string;
	role?: UserRoleEnum;
	sub: string; // Firebase UID
}

export function decodeJWT(token: string): JWTClaims | null {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) {
			return null;
		}

		// Decode the payload (second part)
		const [, payload] = parts;
		const decoded = atob(payload.replaceAll("-", "+").replaceAll("_", "/"));
		return JSON.parse(decoded) as JWTClaims;
	} catch {
		// Silently fail - JWT decoding errors are expected for invalid tokens
		return null;
	}
}

export function getOrganizationFromJWT(token: string): null | string {
	const claims = decodeJWT(token);
	return claims?.organization_id ?? null;
}

export function getRoleFromJWT(token: string): null | UserRoleEnum {
	const claims = decodeJWT(token);
	return claims?.role ?? null;
}
