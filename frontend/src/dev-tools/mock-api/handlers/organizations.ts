import { FundingOrganizationFactory, OrganizationFactory } from "::testing/factories";
import type { API } from "@/types/api-types";

const organizationStore = new Map<string, API.CreateOrganization.Http201.ResponseBody>();

export const organizationHandlers = {
	createOrganization: async ({ body }: { body?: any }): Promise<API.CreateOrganization.Http201.ResponseBody> => {
		const requestBody = body as API.CreateOrganization.RequestBody;
		console.log("[Mock API] Creating organization:", requestBody.full_name);
		const organization = OrganizationFactory.build({
			abbreviation: requestBody.abbreviation,
			full_name: requestBody.full_name,
		});
		organizationStore.set(organization.id, organization);
		return organization;
	},

	listFundingOrganizations: async (): Promise<
		NonNullable<API.CreateApplication.Http201.ResponseBody["grant_template"]>["funding_organization"][]
	> => {
		console.log("[Mock API] Listing funding organizations");
		return FundingOrganizationFactory.batch(5);
	},

	updateOrganization: async ({
		body,
		params,
	}: {
		body?: any;
		params?: Record<string, string>;
	}): Promise<API.UpdateOrganization.Http200.ResponseBody> => {
		const requestBody = body as API.UpdateOrganization.RequestBody;
		const organizationId = params?.organization_id;
		if (!organizationId) {
			throw new Error("Organization ID required");
		}

		console.log("[Mock API] Updating organization:", organizationId);

		const existingOrg = organizationStore.get(organizationId);
		if (!existingOrg) {
			throw new Error("Organization not found");
		}

		const updatedOrg = {
			...existingOrg,
			...requestBody,
		};
		organizationStore.set(organizationId, updatedOrg);

		return updatedOrg;
	},
};