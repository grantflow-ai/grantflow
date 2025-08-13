import { toast } from "sonner";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

import {
	getOrganization as handleGetOrganization,
	getOrganizations as handleGetOrganizations,
	updateOrganization as handleUpdateOrganization,
} from "@/actions/organization";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger/client";

type OrganizationsListType = API.ListOrganizations.Http200.ResponseBody;
interface OrganizationState {
	organization: null | OrganizationType;
	organizations: OrganizationsListType;
	selectedOrganizationId: null | string;
}

type OrganizationType = API.GetOrganization.Http200.ResponseBody;

const initialState: OrganizationState = {
	organization: null,
	organizations: [],
	selectedOrganizationId: null,
};

interface OrganizationActions {
	clearOrganization: () => void;
	getOrganization: (organizationId: string) => Promise<void>;
	getOrganizations: () => Promise<void>;
	selectOrganization: (organizationId: string) => void;
	setOrganization: (organization: OrganizationType) => void;
	setOrganizations: (organizations: OrganizationsListType) => void;
	updateOrganization: (organizationId: string, data: API.UpdateOrganization.RequestBody) => Promise<void>;
}

export const useOrganizationStore = create<OrganizationActions & OrganizationState>()(
	devtools(
		(set, get) => ({
			...initialState,

			clearOrganization: () => {
				set({
					organization: null,
					selectedOrganizationId: null,
				});
			},

			getOrganization: async (organizationId: string) => {
				try {
					const response = await handleGetOrganization(organizationId);
					set({ organization: response });
					log.info("organization-store.ts: getOrganization", {
						message: "Organization retrieved successfully",
						organization: response,
					});
				} catch (error: unknown) {
					log.error("getOrganization", error);
					toast.error("Failed to retrieve organization");
				}
			},

			getOrganizations: async () => {
				try {
					const response = await handleGetOrganizations();
					set({ organizations: response });

					const { selectedOrganizationId } = get();
					if (!selectedOrganizationId && response.length > 0) {
						set({ selectedOrganizationId: response[0].id });
					}

					log.info("organization-store.ts: getOrganizations", {
						count: response.length,
						message: "Organizations retrieved successfully",
					});
				} catch (error: unknown) {
					log.error("getOrganizations", error);
					toast.error("Failed to retrieve organizations");
				}
			},

			selectOrganization: (organizationId: string) => {
				set({ selectedOrganizationId: organizationId });
				log.info("organization-store.ts: selectOrganization", {
					message: "Organization selected",
					organizationId,
				});
			},

			setOrganization: (organization: OrganizationType) => {
				set({ organization });
			},

			setOrganizations: (organizations: OrganizationsListType) => {
				set({ organizations });
			},

			updateOrganization: async (organizationId: string, data: API.UpdateOrganization.RequestBody) => {
				const { organization, organizations } = get();
				const previousOrganization = organization;
				const previousOrganizations = organizations;

				try {
					await handleUpdateOrganization(organizationId, data);

					const updatedOrganization = await handleGetOrganization(organizationId);
					const updatedOrganizations = await handleGetOrganizations();

					set({
						organization: organization?.id === organizationId ? updatedOrganization : organization,
						organizations: updatedOrganizations,
					});

					toast.success("Organization updated successfully");
				} catch (error: unknown) {
					set({
						organization: previousOrganization,
						organizations: previousOrganizations,
					});
					log.error("updateOrganization", error);
					toast.error("Failed to update organization");
				}
			},
		}),
		{
			name: "OrganizationStore",
		},
	),
);
