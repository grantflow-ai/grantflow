"use client";

import { toast } from "sonner";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { getGrantingInstitution as handleGetGrantingInstitution } from "@/actions/granting-institutions";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger/client";

interface AdminState {
	grantingInstitution: GrantingInstitutionType | null;
	isLoading: boolean;
	selectedGrantingInstitutionId: null | string;
}

type GrantingInstitutionType = API.GetGrantingInstitution.Http200.ResponseBody;

const initialState: AdminState = {
	grantingInstitution: null,
	isLoading: false,
	selectedGrantingInstitutionId: null,
};

interface AdminActions {
	clearSelection: () => void;
	getGrantingInstitution: (institutionId: string) => Promise<void>;
	selectGrantingInstitution: (institutionId: string) => void;
	setGrantingInstitution: (institution: GrantingInstitutionType) => void;
}

export const useAdminStore = create<AdminActions & AdminState>()(
	devtools(
		persist(
			(set, get) => ({
				...initialState,

				clearSelection: () => {
					log.info("admin-store.ts: clearSelection", {
						message: "Cleared granting institution selection",
					});
					set({
						grantingInstitution: null,
						selectedGrantingInstitutionId: null,
					});
				},

				getGrantingInstitution: async (institutionId: string) => {
					set({ isLoading: true });
					try {
						const response = await handleGetGrantingInstitution(institutionId);
						set({
							grantingInstitution: response,
							isLoading: false,
						});
						log.info("admin-store.ts: getGrantingInstitution", {
							institution: response,
							message: "Granting institution retrieved successfully",
						});
					} catch (error: unknown) {
						log.error("getGrantingInstitution", error);
						toast.error("Failed to retrieve granting institution");
						set({ isLoading: false });
					}
				},

				selectGrantingInstitution: (institutionId: string) => {
					const { selectedGrantingInstitutionId: currentId } = get();
					if (currentId !== institutionId) {
						set({ selectedGrantingInstitutionId: institutionId });
						log.info("admin-store.ts: selectGrantingInstitution", {
							institutionId,
							message: "Granting institution selected",
						});
					}
				},

				setGrantingInstitution: (institution: GrantingInstitutionType) => {
					set({ grantingInstitution: institution });
				},
			}),
			{
				name: "admin-store",
				partialize: (state) => ({
					selectedGrantingInstitutionId: state.selectedGrantingInstitutionId,
				}),
			},
		),
		{
			name: "AdminStore",
		},
	),
);
