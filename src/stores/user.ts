import type { User } from "@/types/auth-types";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface UserStore {
	user: User | null;
}

export const userStore = create<UserStore>()(
	devtools((set, get) => ({
		user: null,
		setUser: (user: User | null) => {
			set({ user });
		},
		getUser: () => {
			return get().user;
		},
	})),
);
