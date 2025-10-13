import type { UserRole } from "@/types/user";

export interface JWTClaims {
	exp?: number;
	iat: number;
	is_backoffice_admin?: boolean;
	jti: string;
	organization_id?: string;
	role?: UserRole;
	sub: string;
}

export function decodeJWT(token: string): JWTClaims | null {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) {
			return null;
		}

		const [, payload] = parts;
		const decoded = atob(payload.replaceAll("-", "+").replaceAll("_", "/"));
		return JSON.parse(decoded) as JWTClaims;
	} catch {
		return null;
	}
}

export function getBackofficeAdminFromJWT(token: string): boolean {
	const claims = decodeJWT(token);
	return claims?.is_backoffice_admin ?? false;
}

export function getOrganizationFromJWT(token: string): null | string {
	const claims = decodeJWT(token);
	return claims?.organization_id ?? null;
}

export function getRoleFromJWT(token: string): null | UserRole {
	const claims = decodeJWT(token);
	return claims?.role ?? null;
}
