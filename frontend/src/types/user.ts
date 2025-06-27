export enum UserRole {
	ADMIN = "ADMIN",
	MEMBER = "MEMBER",
	OWNER = "OWNER",
}

export type UserRoleType = keyof typeof UserRole;
