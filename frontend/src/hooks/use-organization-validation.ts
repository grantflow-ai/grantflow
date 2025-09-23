"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useOrgCookie } from "@/hooks/use-org-cookie";
import { useOrganizationStore } from "@/stores/organization-store";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger/client";

export function useOrganizationValidation(organizations: API.ListOrganizations.Http200.ResponseBody) {
	const { clearOrganizationCookie, selectedOrganizationId, setOrganizationCookie } = useOrgCookie();
	const {
		clearOrganization,
		selectedOrganizationId: storeOrgId,
		selectOrganization,
		setOrganizations,
	} = useOrganizationStore();

	useEffect(() => {
		setOrganizations(organizations);
	}, [organizations, setOrganizations]);

	useEffect(() => {
		if (organizations.length === 0) {
			log.info("No organizations available, clearing organization state");
			clearOrganization();
			clearOrganizationCookie();
			return;
		}

		if (!selectedOrganizationId) {
			const firstOrgId = organizations[0].id;
			log.info("No organization selected, setting first available", {
				organization_id: firstOrgId,
			});
			setOrganizationCookie(firstOrgId);
			selectOrganization(firstOrgId);
			return;
		}

		const isValidOrganization = organizations.some((org) => org.id === selectedOrganizationId);

		if (!isValidOrganization) {
			log.warn("Invalid organization ID in cookie, switching to first available", {
				available_orgs: organizations.map((org) => org.id),
				invalid_org_id: selectedOrganizationId,
			});

			clearOrganizationCookie();
			const firstOrgId = organizations[0].id;
			setOrganizationCookie(firstOrgId);
			selectOrganization(firstOrgId);

			toast.info("Organization not found. Switched to available organization.");
			return;
		}

		if (storeOrgId !== selectedOrganizationId) {
			selectOrganization(selectedOrganizationId);
		}
		log.info("Organization validation successful", {
			organization_id: selectedOrganizationId,
		});
	}, [
		organizations,
		selectedOrganizationId,
		storeOrgId,
		setOrganizationCookie,
		clearOrganizationCookie,
		selectOrganization,
		clearOrganization,
	]);

	return organizations.length > 0 ? selectedOrganizationId : null;
}
