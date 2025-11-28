"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useOrgCookie } from "@/hooks/use-org-cookie";
import { useOrganizationStore } from "@/stores/organization-store";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger/client";

interface OrganizationActions {
	clearOrganization: () => void;
	clearOrganizationCookie: () => void;
	selectOrganization: (id: string) => void;
	setOrganizationCookie: (id: string) => void;
}

export function useOrganizationValidation(
	organizations: API.ListOrganizations.Http200.ResponseBody,
	organizationsLoading?: boolean,
	organizationsSet?: boolean,
) {
	const { clearOrganizationCookie, selectedOrganizationId, setOrganizationCookie } = useOrgCookie();
	const {
		clearOrganization,
		selectedOrganizationId: storeOrgId,
		selectOrganization,
		setOrganizations,
	} = useOrganizationStore();

	useEffect(() => {
		if (organizationsLoading || organizationsSet) {
			return;
		}

		setOrganizations(organizations);
	}, [organizations, setOrganizations, organizationsLoading, organizationsSet]);

	useEffect(() => {
		if (organizationsLoading) {
			return;
		}

		const actions: OrganizationActions = {
			clearOrganization,
			clearOrganizationCookie,
			selectOrganization,
			setOrganizationCookie,
		};

		if (organizations.length === 0) {
			handleNoOrganizations(actions, selectedOrganizationId, storeOrgId, organizationsSet);
			return;
		}

		if (!selectedOrganizationId) {
			handleNoSelectedOrganization(organizations, actions);
			return;
		}

		const isValidOrganization = organizations.some((org) => org.id === selectedOrganizationId);

		if (!isValidOrganization) {
			handleInvalidOrganization(organizations, selectedOrganizationId, actions);
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
		organizationsLoading,
		organizationsSet,
	]);

	return organizations.length > 0 ? selectedOrganizationId : null;
}

function handleInvalidOrganization(
	organizations: API.ListOrganizations.Http200.ResponseBody,
	selectedOrganizationId: string,
	actions: OrganizationActions,
) {
	log.warn("Invalid organization ID in cookie, switching to first available", {
		available_orgs: organizations.map((org) => org.id),
		invalid_org_id: selectedOrganizationId,
	});

	const [firstOrganization] = organizations;
	if (!firstOrganization) {
		log.warn("Invalid organization ID with no available organizations", {
			invalid_org_id: selectedOrganizationId,
		});
		return;
	}

	actions.clearOrganizationCookie();
	const firstOrgId = firstOrganization.id;
	actions.setOrganizationCookie(firstOrgId);
	actions.selectOrganization(firstOrgId);

	toast.info("Organization not found. Switched to available organization.");
}

function handleNoOrganizations(
	actions: OrganizationActions,
	selectedOrganizationId: null | string,
	storeOrgId: null | string,
	organizationsSet?: boolean,
) {
	log.info("No organizations available, clearing organization state");
	if (!organizationsSet && storeOrgId !== null) {
		actions.clearOrganization();
	}
	if (selectedOrganizationId !== null) {
		actions.clearOrganizationCookie();
	}
}

function handleNoSelectedOrganization(
	organizations: API.ListOrganizations.Http200.ResponseBody,
	actions: OrganizationActions,
) {
	const [firstOrganization] = organizations;
	if (!firstOrganization) {
		log.warn("No organization selected and no organizations available");
		return;
	}

	const firstOrgId = firstOrganization.id;
	log.info("No organization selected, setting first available", {
		organization_id: firstOrgId,
	});
	actions.setOrganizationCookie(firstOrgId);
	actions.selectOrganization(firstOrgId);
}
