export enum UserRole {
	ADMIN = "ADMIN",
	MEMBER = "MEMBER",
	OWNER = "OWNER",
}

export interface UserInfo {
	customClaims: null | Record<string, any>;
	disabled: boolean;
	displayName: null | string;
	email: null | string;
	emailVerified: boolean;
	phoneNumber: null | string;
	photoURL: null | string;
	providerData: {
		displayName: null | string;
		email: null | string;
		phoneNumber: null | string;
		photoURL: null | string;
		providerId: string;
		uid: string;
	}[];
	tenantId: null | string;
	uid: string;
}

export type UserRoleType = keyof typeof UserRole;
