"use client";

import { format } from "date-fns";
import { Building2, FileText } from "lucide-react";
import { AppButton } from "@/components/app/buttons/app-button";
import { CardActionMenu } from "@/components/organizations/dashboard/card-action-menu";
import type { API } from "@/types/api-types";

interface GrantingInstitutionCardProps {
	institution: API.ListGrantingInstitutions.Http200.ResponseBody[0];
	onDelete: (id: string) => void;
	onView: (id: string, name: string) => void;
}

export function GrantingInstitutionCard({ institution, onDelete, onView }: GrantingInstitutionCardProps) {
	return (
		<div
			className="relative flex h-[206px] flex-col rounded-lg border px-4 py-4 bg-preview-bg border-[#E1DFEB] hover:border-primary hover:border-2 transition-all"
			data-testid={`granting-institution-card-${institution.id}`}
		>
			<header className="flex flex-col gap-3">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-1">
						<div className="flex flex-col gap-1">
							<span className="text-[10px] font-normal text-app-gray-600">
								Last edited {format(new Date(institution.updated_at), "dd.MM.yy")}
							</span>
						</div>
					</div>

					<div className="flex items-center pt-2 gap-3">
						<CardActionMenu
							onDelete={() => {
								onDelete(institution.id);
							}}
						/>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div className="size-[19px] rounded-full bg-app-gray-300 flex items-center justify-center">
						<Building2 className="size-3 text-app-gray-600" />
					</div>
					<h3
						className="text-base font-semibold leading-[22px] text-app-black"
						data-testid={`granting-institution-card-name-${institution.id}`}
					>
						{institution.full_name}
					</h3>
				</div>

				{institution.abbreviation && (
					<p
						className="text-sm font-normal leading-[20px] text-app-gray-600"
						data-testid={`granting-institution-card-abbreviation-${institution.id}`}
					>
						{institution.abbreviation}
					</p>
				)}
			</header>

			<main className="flex h-full w-full items-end pt-3">
				<div className="flex gap-2">
					<div className="w-fit bg-app-lavender-gray px-2 py-1 flex gap-1 rounded-[2px] items-center">
						<FileText className="size-4 text-app-gray-600" />
						<span className="text-sm font-normal text-app-black">
							<span className="font-semibold">{institution.source_count}</span>{" "}
							{institution.source_count === 1 ? "source" : "sources"}
						</span>
					</div>
				</div>

				<div className="ml-auto flex items-center gap-2">
					<AppButton
						className="w-[97px] py-0.5 bg-white"
						data-testid={`granting-institution-card-view-button-${institution.id}`}
						onClick={() => {
							onView(institution.id, institution.full_name);
						}}
						variant="secondary"
					>
						View
					</AppButton>
				</div>
			</main>
		</div>
	);
}
