"use client";

import type { API } from "@/types/api-types";
import { GrantingInstitutionCard } from "./granting-institution-card";

interface GrantingInstitutionListProps {
	institutions: API.ListGrantingInstitutions.Http200.ResponseBody;
	onDelete: (id: string) => void;
	onView: (id: string, name: string) => void;
	selectedId?: null | string;
}

export function GrantingInstitutionList({ institutions, onDelete, onView, selectedId }: GrantingInstitutionListProps) {
	if (institutions.length === 0) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<p className="text-lg font-medium text-gray-900">No granting institutions yet</p>
					<p className="mt-1 text-sm text-gray-500">Create your first granting institution to get started</p>
				</div>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="granting-institution-list">
			{institutions.map((institution) => (
				<GrantingInstitutionCard
					institution={institution}
					isSelected={selectedId === institution.id}
					key={institution.id}
					onDelete={onDelete}
					onView={onView}
				/>
			))}
		</div>
	);
}
