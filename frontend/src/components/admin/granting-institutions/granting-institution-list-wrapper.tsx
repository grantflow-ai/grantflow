"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deleteGrantingInstitution } from "@/actions/granting-institutions";
import type { API } from "@/types/api-types";
import { routes } from "@/utils/navigation";
import { DeleteGrantingInstitutionModal } from "./delete-granting-institution-modal";
import { GrantingInstitutionList } from "./granting-institution-list";

interface GrantingInstitutionListWrapperProps {
	institutions: API.ListGrantingInstitutions.Http200.ResponseBody;
}

export function GrantingInstitutionListWrapper({ institutions }: GrantingInstitutionListWrapperProps) {
	const router = useRouter();
	const [deletingId, setDeletingId] = useState<null | string>(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [institutionToDelete, setInstitutionToDelete] = useState<null | string>(null);

	const handleDeleteClick = (id: string) => {
		setInstitutionToDelete(id);
		setShowDeleteModal(true);
	};

	const confirmDelete = async () => {
		if (!institutionToDelete) return;

		setDeletingId(institutionToDelete);
		try {
			await deleteGrantingInstitution(institutionToDelete);
			toast.success("Granting institution deleted successfully");
			router.refresh();
		} catch {
			toast.error("Failed to delete granting institution. Please try again.");
		} finally {
			setDeletingId(null);
			setInstitutionToDelete(null);
		}
	};

	const handleView = (id: string, _name: string) => {
		router.push(routes.admin.grantingInstitutions.detail(id));
	};

	// Filter out the institution being deleted for optimistic UI
	const visibleInstitutions = deletingId ? institutions.filter((inst) => inst.id !== deletingId) : institutions;

	return (
		<>
			<GrantingInstitutionList
				institutions={visibleInstitutions}
				onDelete={handleDeleteClick}
				onView={handleView}
			/>
			<DeleteGrantingInstitutionModal
				isOpen={showDeleteModal}
				onClose={() => {
					setShowDeleteModal(false);
					setInstitutionToDelete(null);
				}}
				onConfirm={confirmDelete}
			/>
		</>
	);
}
