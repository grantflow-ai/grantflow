"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteGrantingInstitution } from "@/actions/granting-institutions";
import type { API } from "@/types/api-types";
import { routes } from "@/utils/navigation";
import { GrantingInstitutionList } from "./granting-institution-list";

interface GrantingInstitutionListWrapperProps {
	institutions: API.ListGrantingInstitutions.Http200.ResponseBody;
}

export function GrantingInstitutionListWrapper({ institutions }: GrantingInstitutionListWrapperProps) {
	const router = useRouter();
	const [deletingId, setDeletingId] = useState<null | string>(null);

	const handleDelete = async (id: string) => {
		if (!confirm("Are you sure you want to delete this granting institution?")) {
			return;
		}

		setDeletingId(id);
		try {
			await deleteGrantingInstitution(id);
			router.refresh();
		} catch {
			alert("Failed to delete granting institution. Please try again.");
		} finally {
			setDeletingId(null);
		}
	};

	const handleView = (id: string, _name: string) => {
		router.push(routes.admin.grantingInstitutions.detail(id));
	};

	// Filter out the institution being deleted for optimistic UI
	const visibleInstitutions = deletingId ? institutions.filter((inst) => inst.id !== deletingId) : institutions;

	return <GrantingInstitutionList institutions={visibleInstitutions} onDelete={handleDelete} onView={handleView} />;
}
