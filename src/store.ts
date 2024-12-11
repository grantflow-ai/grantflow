import { create } from "zustand";
import { UserInfo } from "@firebase/auth";
import { GrantApplication, GrantCfp, Workspace } from "@/types/api-types";

export interface UserStore {
	user: UserInfo | null;
	setUser: (user: UserInfo | null) => void;
	workspaces: Workspace[];
	setWorkspaces: (workspaces: Workspace[]) => void;
	applications: GrantApplication[];
	setApplications: (applications: GrantApplication[]) => void;
	grantCfps: GrantCfp[];
	setGrantCfps: (cfps: GrantCfp[]) => void;
}

export const useStore = create<UserStore>((set) => ({
	user: null,
	setUser: (user: UserInfo | null) => {
		set({ user });
	},
	workspaces: [],
	setWorkspaces: (workspaces: Workspace[]) => {
		set({ workspaces });
	},
	applications: [],
	setApplications: (applications: GrantApplication[]) => {
		set({
			applications,
		});
	},
	grantCfps: [],
	setGrantCfps: (cfps: GrantCfp[]) => {
		set({
			grantCfps: cfps.sort((a, b) => a.code.localeCompare(b.code)),
		});
	},
}));
