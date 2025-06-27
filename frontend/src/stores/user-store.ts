import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface UserInfo {
	displayName: null | string;
	email: null | string;
	emailVerified: boolean;
	photoURL: null | string;
	providerId?: string;
	uid: string;
}

interface UserStore {
	clearUser: () => void;
	isAuthenticated: boolean;
	setUser: (user: null | UserInfo) => void;
	user: null | UserInfo;
}

export const useUserStore = create<UserStore>()(
	devtools(
		persist(
			(set) => ({
				clearUser: () => {
					set({
						isAuthenticated: false,
						user: null,
					});
				},
				isAuthenticated: false,
				setUser: (user) => {
					set({
						isAuthenticated: !!user,
						user,
					});
				},
				user: null,
			}),
			{
				name: "user-store",
			},
		),
		{
			name: "UserStore",
		},
	),
);
