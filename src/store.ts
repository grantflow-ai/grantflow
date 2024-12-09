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

export const useStore = create<UserStore>((set, get) => ({
	user: null,
	setUser: (user: UserInfo | null) => {
		set({ user });
	},
	workspaces: [],
	setWorkspaces: (workspaces: Workspace[]) => {
		const newWorkspaceIds = new Set(workspaces.map((w) => w.id));
		const existingWorkspaces = get().workspaces.filter((w) => !newWorkspaceIds.has(w.id));
		set({ workspaces: [...workspaces, ...existingWorkspaces].sort((a, b) => a.name.localeCompare(b.name)) });
	},
	applications: [],
	setApplications: (applications: GrantApplication[]) => {
		const newApplicationIds = new Set(applications.map((a) => a.id));
		const existingApplications = get().applications.filter((a) => !newApplicationIds.has(a.id));
		set({
			applications: [...applications, ...existingApplications].sort((a, b) => a.title.localeCompare(b.title)),
		});
	},
	grantCfps: [],
	setGrantCfps: (cfps: GrantCfp[]) => {
		const newCfpIds = new Set(cfps.map((c) => c.id));
		const existingCfps = get().grantCfps.filter((c) => !newCfpIds.has(c.id));
		set({
			grantCfps: [...cfps, ...existingCfps].sort((a, b) => a.code.localeCompare(b.code)),
		});
	},
}));
