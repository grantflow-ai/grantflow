import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { UserInfo } from "@/types/user";

interface UserStore {
	clearUser: () => void;
	dismissWelcomeModal: () => void;
	hasSeenWelcomeModal: boolean;
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
						hasSeenWelcomeModal: false,
						isAuthenticated: false,
						user: null,
					});
				},
				dismissWelcomeModal: () => {
					set({ hasSeenWelcomeModal: true });
				},
				hasSeenWelcomeModal: false,
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
