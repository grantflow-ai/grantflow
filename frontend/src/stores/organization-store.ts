import { toast } from "sonner";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

import {
	deleteOrganizationLogo as handleDeleteOrganizationLogo,
	getOrganization as handleGetOrganization,
	getOrganizations as handleGetOrganizations,
	updateOrganization as handleUpdateOrganization,
	uploadOrganizationLogo as handleUploadOrganizationLogo,
} from "@/actions/organization";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger/client";

type OrganizationsListType = API.ListOrganizations.Http200.ResponseBody;
interface OrganizationState {
	organization: null | OrganizationType;
	organizations: OrganizationsListType;
	selectedOrganizationId: null | string | undefined;
}

type OrganizationType = API.GetOrganization.Http200.ResponseBody;

const initialState: OrganizationState = {
	organization: null,
	organizations: [],
	selectedOrganizationId: undefined,
};

interface OrganizationActions {
	clearOrganization: () => void;
	deleteOrganizationLogo: (organizationId: string) => Promise<void>;
	getOrganization: (organizationId: string) => Promise<void>;
	getOrganizations: () => Promise<void>;
	selectOrganization: (organizationId: string) => void;
	setOrganization: (organization: OrganizationType) => void;
	setOrganizations: (organizations: OrganizationsListType) => void;
	updateOrganization: (organizationId: string, data: API.UpdateOrganization.RequestBody) => Promise<void>;
	uploadOrganizationLogo: (organizationId: string, file: File) => Promise<string>;
}

export const useOrganizationStore = create<OrganizationActions & OrganizationState>()(
	devtools(
		(set, get) => ({
			...initialState,

			clearOrganization: () => {
				set({
					organization: null,
					organizations: [],
					selectedOrganizationId: null,
				});
			},

			deleteOrganizationLogo: async (organizationId: string) => {
				const { organization, organizations } = get();

				try {
					await handleDeleteOrganizationLogo(organizationId);

					const updatedOrganization = await handleGetOrganization(organizationId);
					const updatedOrganizations = await handleGetOrganizations();

					set({
						organization: organization?.id === organizationId ? updatedOrganization : organization,
						organizations: updatedOrganizations,
					});

					log.info("organization-store.ts: deleteOrganizationLogo", {
						message: "Organization logo deleted successfully",
						organizationId,
					});
				} catch (error: unknown) {
					set({
						organization,
						organizations,
					});
					log.error("deleteOrganizationLogo", error);
					toast.error("Failed to delete organization logo");
					throw error;
				}
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
					const [firstOrg] = response;
					if (!selectedOrganizationId && firstOrg) {
						set({ selectedOrganizationId: firstOrg.id });
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
				const { selectedOrganizationId: currentId } = get();
				if (currentId !== organizationId) {
					set({ selectedOrganizationId: organizationId });
					log.info("organization-store.ts: selectOrganization", {
						message: "Organization selected",
						organizationId,
					});
				}
			},

			setOrganization: (organization: OrganizationType) => {
				set({ organization });
			},

			setOrganizations: (organizations: OrganizationsListType) => {
				set({ organizations });
			},

			updateOrganization: async (organizationId: string, data: API.UpdateOrganization.RequestBody) => {
				const { organization, organizations } = get();

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
						organization,
						organizations,
					});
					log.error("updateOrganization", error);
					toast.error("Failed to update organization");
				}
			},

			uploadOrganizationLogo: async (organizationId: string, file: File) => {
				const { organization, organizations } = get();

				try {
					const response = await handleUploadOrganizationLogo(organizationId, file);

					const updatedOrganization = await handleGetOrganization(organizationId);
					const updatedOrganizations = await handleGetOrganizations();

					set({
						organization: organization?.id === organizationId ? updatedOrganization : organization,
						organizations: updatedOrganizations,
					});

					log.info("organization-store.ts: uploadOrganizationLogo", {
						logoUrl: response.logo_url,
						message: "Organization logo uploaded successfully",
						organizationId,
					});

					return response.logo_url;
				} catch (error: unknown) {
					set({
						organization,
						organizations,
					});
					log.error("uploadOrganizationLogo", error);
					toast.error("Failed to upload organization logo");
					throw error;
				}
			},
		}),
		{
			name: "OrganizationStore",
		},
	),
);
