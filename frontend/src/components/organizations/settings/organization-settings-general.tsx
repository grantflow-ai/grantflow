"use client";

import { Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useOrganizationStore } from "@/stores/organization-store";
import { UserRole } from "@/types/user";
import { log } from "@/utils/logger/client";
import { DeleteOrganizationModal } from "./delete-organization-modal";

interface OrganizationSettingsGeneralProps {
	organizationId: string;
	userRole?: UserRole;
}

export function OrganizationSettingsGeneral({
	organizationId,
	userRole = UserRole.COLLABORATOR,
}: OrganizationSettingsGeneralProps) {
	const { organization, updateOrganization } = useOrganizationStore();
	const [organizationName, setOrganizationName] = useState(organization?.name ?? "");
	const [institutionName, setInstitutionName] = useState(organization?.institutional_affiliation ?? "");
	const [contactName, setContactName] = useState(organization?.contact_person_name ?? "");
	const [contactEmail, setContactEmail] = useState(organization?.contact_email ?? "");
	const [isUpdating, setIsUpdating] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const canEdit = userRole === UserRole.OWNER;
	const isReadOnly = !canEdit;

	useEffect(() => {
		if (organization) {
			setOrganizationName(organization.name);
			setInstitutionName(organization.institutional_affiliation ?? "");
			setContactName(organization.contact_person_name ?? "");
			setContactEmail(organization.contact_email ?? "");
		}
	}, [organization]);

	const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (!canEdit) return;

		const file = event.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			toast.error("Please select an image file (PNG, JPG, or JPEG)");
			return;
		}

		if (file.size > 10 * 1024 * 1024) {
			toast.error("Please select an image under 10MB");
			return;
		}

		setIsUploading(true);
		try {
			// TODO: Implement logo upload
			toast.success("Logo upload functionality coming soon");
		} catch (error) {
			log.error("Error uploading logo", error);
			toast.error("Failed to upload logo");
		} finally {
			setIsUploading(false);

			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handleSave = async () => {
		if (!(organizationId && canEdit)) return;

		setIsUpdating(true);
		try {
			await updateOrganization(organizationId, {
				contact_email: contactEmail,
				contact_person_name: contactName,
				description: organization?.description ?? null,
				institutional_affiliation: institutionName,
				logo_url: organization?.logo_url ?? null,
				name: organizationName,
			});
			toast.success("Organization settings updated successfully");
		} catch (error) {
			log.error("Error updating organization", error);
			toast.error("Failed to update organization settings");
		} finally {
			setIsUpdating(false);
		}
	};

	return (
		<div className="flex flex-col gap-10 max-w-[655px]" data-testid="organization-settings-general">
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<h2 className="font-heading font-medium text-[24px] leading-[30px] text-app-black">
						General Information
					</h2>
				</div>

				<div className="flex flex-col gap-3 px-6">
					<div className="flex flex-col gap-3 w-[340px]">
						<h3 className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">Logo</h3>
						<div className="flex flex-col gap-3">
							<button
								className={`size-[93px] rounded bg-app-gray-100 border-2 border-dashed border-app-gray-300 flex items-center justify-center relative overflow-hidden transition-colors ${
									canEdit ? "cursor-pointer hover:border-primary" : "cursor-not-allowed opacity-60"
								}`}
								data-testid="organization-logo-container"
								disabled={!canEdit}
								onClick={() => canEdit && fileInputRef.current?.click()}
								type="button"
							>
								{organization?.logo_url ? (
									<Image
										alt="Organization Logo"
										className="object-cover"
										fill
										src={organization.logo_url}
									/>
								) : (
									<Plus className="size-4 text-app-gray-700" />
								)}
							</button>
							<input
								accept="image/*"
								className="hidden"
								disabled={isUploading || !canEdit}
								onChange={handleLogoUpload}
								ref={fileInputRef}
								type="file"
							/>
							<p className="text-[14px] text-app-gray-700 font-body">
								We support PNG, JPG, JPEG under 10MB
							</p>
						</div>
					</div>

					<div className="flex flex-col gap-3 w-[340px]">
						<h3 className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">
							Organisation Name
						</h3>
						<input
							className={`w-full h-10 px-3 border border-app-gray-300 rounded bg-white text-[14px] font-body text-app-gray-600 placeholder:text-app-gray-400 focus:outline-none ${
								canEdit ? "focus:border-primary" : "cursor-not-allowed opacity-60"
							}`}
							data-testid="organization-name-input"
							onChange={(e) => {
								if (canEdit) {
									setOrganizationName(e.target.value);
								}
							}}
							placeholder="Name Name"
							readOnly={isReadOnly}
							type="text"
							value={organizationName}
						/>
					</div>

					<div className="flex flex-col gap-3 w-[340px]">
						<h3 className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">
							Institution or Affiliation
						</h3>
						<input
							className={`w-full h-10 px-3 border border-app-gray-300 rounded bg-white text-[14px] font-body text-app-gray-600 placeholder:text-app-gray-400 focus:outline-none ${
								canEdit ? "focus:border-primary" : "cursor-not-allowed opacity-60"
							}`}
							data-testid="organization-institution-input"
							onChange={(e) => {
								if (canEdit) {
									setInstitutionName(e.target.value);
								}
							}}
							placeholder="Name Name"
							readOnly={isReadOnly}
							type="text"
							value={institutionName}
						/>
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<h2 className="font-heading font-medium text-[24px] leading-[30px] text-app-black">
						Primary Contact
					</h2>
				</div>

				<div className="flex flex-col gap-3 px-6">
					<div className="flex flex-col gap-3 w-[340px]">
						<h3 className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">
							Contact Person Name
						</h3>
						<input
							className={`w-full h-10 px-3 border border-app-gray-600 rounded bg-white text-[14px] font-body text-app-gray-600 placeholder:text-app-gray-600 focus:outline-none ${
								canEdit ? "focus:border-primary" : "cursor-not-allowed opacity-60"
							}`}
							data-testid="organization-contact-name-input"
							onChange={(e) => {
								if (canEdit) {
									setContactName(e.target.value);
								}
							}}
							placeholder="Name Name"
							readOnly={isReadOnly}
							type="text"
							value={contactName}
						/>
					</div>

					<div className="flex flex-col gap-3 w-[340px]">
						<h3 className="font-heading font-semibold text-[16px] leading-[22px] text-app-black">
							Email address
						</h3>
						<div className="relative">
							<input
								className={`w-full h-10 px-3 pr-10 border border-app-gray-600 rounded bg-white text-[14px] font-body text-app-gray-600 placeholder:text-app-gray-600 focus:outline-none ${
									canEdit ? "focus:border-primary" : "cursor-not-allowed opacity-60"
								}`}
								data-testid="organization-contact-email-input"
								onChange={(e) => {
									if (canEdit) {
										setContactEmail(e.target.value);
									}
								}}
								placeholder="Email@address.com"
								readOnly={isReadOnly}
								type="email"
								value={contactEmail}
							/>
							<svg
								className="absolute right-3 top-1/2 -translate-y-1/2 size-4"
								fill="none"
								viewBox="0 0 16 16"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M2.66667 2.66667H13.3333C14.0667 2.66667 14.6667 3.26667 14.6667 4V12C14.6667 12.7333 14.0667 13.3333 13.3333 13.3333H2.66667C1.93333 13.3333 1.33333 12.7333 1.33333 12V4C1.33333 3.26667 1.93333 2.66667 2.66667 2.66667Z"
									stroke="#636170"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="1.5"
								/>
								<path
									d="M14.6667 4L8 8.66667L1.33333 4"
									stroke="#636170"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="1.5"
								/>
							</svg>
						</div>
					</div>
				</div>
			</div>

			{userRole === UserRole.OWNER && (
				<div className="border border-error rounded p-6">
					<div className="flex flex-col gap-6">
						<div className="flex flex-col gap-2">
							<h2 className="font-heading font-medium text-[24px] leading-[30px] text-app-black">
								Danger Zone - Delete o<span className="font-bold">rganisation</span>
							</h2>
							<p className="text-[16px] text-app-black font-body">
								Permanently delete your GrantFlow account, including all projects, data, and team
								access. This action cannot be undone.
							</p>
						</div>

						<div>
							<button
								className="flex items-center gap-1 px-1 py-0.5 border border-error rounded bg-white text-error font-button text-[14px] hover:bg-error hover:text-white transition-colors"
								data-testid="organization-delete-button"
								onClick={() => {
									setShowDeleteModal(true);
								}}
								type="button"
							>
								<Trash2 className="size-4" />
								Delete organisation
							</button>
						</div>
					</div>
				</div>
			)}

			{canEdit && (
				<div className="flex justify-end">
					<button
						className="px-4 py-2 bg-primary text-white rounded font-button text-[14px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						data-testid="organization-save-button"
						disabled={isUpdating}
						onClick={handleSave}
						type="button"
					>
						{isUpdating ? "Saving..." : "Save Changes"}
					</button>
				</div>
			)}

			{organization && (
				<DeleteOrganizationModal
					isOpen={showDeleteModal}
					onClose={() => {
						setShowDeleteModal(false);
					}}
					organizationId={organizationId}
					organizationName={organization.name}
				/>
			)}
		</div>
	);
}
