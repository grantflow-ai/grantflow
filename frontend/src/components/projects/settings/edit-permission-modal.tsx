"use client";

import { ChevronDown, Mail, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BaseModal } from "@/components/app/feedback/base-modal";
import { UserRole } from "@/types/user";
import { generateInitials } from "@/utils/user";

interface EditPermissionModalProps {
	availableProjects?: { id: string; name: string }[];
	currentUserRole: UserRole;
	isOpen: boolean;
	member: null | ProjectMember;
	onClose: () => void;
	onUpdateRole: (memberId: string, newRole: UserRole, projectAccess?: string[]) => Promise<void>;
}

interface ProjectMember {
	email: string;
	firebaseUid: string;
	fullName?: string;
	id: string;
	joinedAt: string;
	photoUrl?: string;
	projectAccess?: string[];
	role: UserRole;
	status: "active" | "pending";
}

const PERMISSION_OPTIONS = [
	{
		description: "Limited access to specific projects only",
		label: "Collaborator (can access applications within specific project)",
		value: UserRole.MEMBER,
	},
	{
		description: "Full access to all projects and management functions",
		label: "Admin (can access all research projects)",
		value: UserRole.ADMIN,
	},
];

// Mock available projects for now
const mockAvailableProjects = [
	{ id: "1", name: "Research Neural Networks" },
	{ id: "2", name: "Research Machine Learning" },
	{ id: "3", name: "Research Quantum Computing" },
	{ id: "4", name: "Research Bioinformatics" },
	{ id: "5", name: "Research Data Science" },
];

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Modal component with complex UI interactions
export function EditPermissionModal({
	availableProjects = mockAvailableProjects,
	currentUserRole,
	isOpen,
	member,
	onClose,
	onUpdateRole,
}: EditPermissionModalProps) {
	const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.MEMBER);
	const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isProjectSearchOpen, setIsProjectSearchOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLDivElement>(null);

	// Initialize state when member changes
	useEffect(() => {
		if (member) {
			setSelectedRole(member.role);
			setSelectedProjects(member.projectAccess ?? []);
		}
	}, [member]);

	// Click outside handlers
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && event.target && !dropdownRef.current.contains(event.target as Node)) {
				setIsDropdownOpen(false);
			}
			if (searchRef.current && event.target && !searchRef.current.contains(event.target as Node)) {
				setIsProjectSearchOpen(false);
			}
		};

		if (isDropdownOpen || isProjectSearchOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isDropdownOpen, isProjectSearchOpen]);

	const handleClose = () => {
		setSelectedRole(UserRole.MEMBER);
		setSelectedProjects([]);
		setSearchQuery("");
		setIsDropdownOpen(false);
		setIsProjectSearchOpen(false);
		setIsSubmitting(false);
		onClose();
	};

	const handleSubmit = async () => {
		if (!member) return;

		setIsSubmitting(true);
		try {
			await onUpdateRole(
				member.id,
				selectedRole,
				selectedRole === UserRole.MEMBER ? selectedProjects : undefined,
			);
			handleClose();
		} catch (error) {
			// Error handling will be implemented with proper notifications
			// eslint-disable-next-line no-console
			console.error("Failed to update permissions:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const addProject = (projectId: string) => {
		if (!selectedProjects.includes(projectId)) {
			setSelectedProjects([...selectedProjects, projectId]);
		}
		setSearchQuery("");
		setIsProjectSearchOpen(false);
	};

	const removeProject = (projectId: string) => {
		setSelectedProjects(selectedProjects.filter((id) => id !== projectId));
	};

	const filteredProjects = availableProjects.filter(
		(project) =>
			project.name.toLowerCase().includes(searchQuery.toLowerCase()) && !selectedProjects.includes(project.id),
	);

	const getProjectName = (projectId: string) => {
		return availableProjects.find((p) => p.id === projectId)?.name ?? `Project ${projectId}`;
	};

	const selectedOption = PERMISSION_OPTIONS.find((option) => option.value === selectedRole);

	if (!member) return null;

	// Check if current user can edit this member
	const canEdit =
		currentUserRole === UserRole.OWNER || (currentUserRole === UserRole.ADMIN && member.role !== UserRole.OWNER);

	return (
		<BaseModal isOpen={isOpen} onClose={handleClose}>
			<div className="flex flex-col gap-6 p-8 w-[464px]" data-testid="edit-permission-modal">
				{/* Header */}
				<div className="flex items-center justify-between">
					<h2 className="font-['Cabin'] font-medium text-[24px] leading-[30px] text-[#2e2d36]">
						Edit Permission
					</h2>
					<button
						aria-label="Close modal"
						className="p-1 rounded-sm hover:bg-[#e1dfeb] transition-colors"
						data-testid="close-button"
						onClick={handleClose}
						type="button"
					>
						<X className="size-4 text-[#636170]" />
					</button>
				</div>

				<p className="font-['Source_Sans_Pro'] text-[14px] text-[#636170] -mt-2">
					Control access and permission levels across research projects.
				</p>

				{/* Form Fields */}
				<div className="flex flex-col gap-4">
					{/* Name Field */}
					<div className="flex flex-col gap-2">
						<label className="font-['Source_Sans_Pro'] text-[14px] text-[#636170]" htmlFor="member-name">
							Name
						</label>
						<input
							className="w-full px-3 py-2 border border-[#e1dfeb] rounded-md font-['Source_Sans_Pro'] text-[16px] text-[#2e2d36] bg-[#f5f5f5] cursor-not-allowed"
							data-testid="name-input"
							disabled
							id="member-name"
							type="text"
							value={member.fullName ?? generateInitials(member.fullName, member.email)}
						/>
					</div>

					{/* Email Field */}
					<div className="flex flex-col gap-2">
						<label className="font-['Source_Sans_Pro'] text-[14px] text-[#636170]" htmlFor="member-email">
							Email address
						</label>
						<div className="relative">
							<input
								className="w-full px-3 py-2 pr-10 border border-[#e1dfeb] rounded-md font-['Source_Sans_Pro'] text-[16px] text-[#636170] bg-[#f5f5f5] cursor-not-allowed"
								data-testid="email-input"
								disabled
								id="member-email"
								type="email"
								value={member.email}
							/>
							<Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 size-4 text-[#636170]" />
						</div>
					</div>

					{/* Permission Dropdown */}
					<div className="flex flex-col gap-2">
						<label
							className="font-['Source_Sans_Pro'] text-[14px] text-[#636170]"
							htmlFor="member-permission"
						>
							Permission
						</label>
						<div className="relative" ref={dropdownRef}>
							<button
								aria-expanded={isDropdownOpen}
								aria-haspopup="listbox"
								className={`w-full px-3 py-2 border rounded-md text-left flex items-center justify-between font-['Source_Sans_Pro'] text-[16px] transition-colors ${
									canEdit
										? "border-[#e1dfeb] text-[#2e2d36] hover:border-[#1e13f8] cursor-pointer"
										: "border-[#e1dfeb] text-[#636170] bg-[#f5f5f5] cursor-not-allowed"
								}`}
								data-testid="permission-dropdown"
								disabled={!canEdit}
								id="member-permission"
								onClick={() => {
									if (canEdit) {
										setIsDropdownOpen(!isDropdownOpen);
									}
								}}
								type="button"
							>
								<span className="truncate">{selectedOption?.label ?? "Select permission level"}</span>
								{canEdit && <ChevronDown className="size-4 text-[#636170] flex-shrink-0" />}
							</button>

							{isDropdownOpen && canEdit && (
								<div
									className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e1dfeb] rounded-md shadow-lg z-10"
									data-testid="permission-dropdown-menu"
								>
									{PERMISSION_OPTIONS.map((option) => (
										<button
											className={`w-full px-3 py-3 text-left hover:bg-[#f5f5f5] transition-colors border-b border-[#e1dfeb] last:border-b-0 ${
												selectedRole === option.value ? "bg-[#f0f0ff]" : ""
											}`}
											data-testid={`permission-option-${option.value}`}
											key={option.value}
											onClick={() => {
												setSelectedRole(option.value);
												setIsDropdownOpen(false);
												// Reset project selection when switching to Admin
												if (option.value === UserRole.ADMIN) {
													setSelectedProjects([]);
												}
											}}
											type="button"
										>
											<div className="font-['Source_Sans_Pro'] text-[14px] text-[#2e2d36] font-medium">
												{option.label}
											</div>
											<div className="font-['Source_Sans_Pro'] text-[12px] text-[#636170] mt-1">
												{option.description}
											</div>
										</button>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Research Project Access - Only show for Collaborator role */}
					{selectedRole === UserRole.MEMBER && (
						<div className="flex flex-col gap-3">
							<span className="font-['Source_Sans_Pro'] text-[14px] text-[#636170]">
								Research Project Access
							</span>

							{/* Selected Projects */}
							{selectedProjects.length > 0 && (
								<div className="flex flex-wrap gap-2">
									{selectedProjects.map((projectId) => (
										<div
											className="flex items-center gap-2 px-3 py-1 bg-[#1e13f8] text-white rounded-full font-['Source_Sans_Pro'] text-[14px]"
											data-testid={`selected-project-${projectId}`}
											key={projectId}
										>
											<span>{getProjectName(projectId)}</span>
											{canEdit && (
												<button
													aria-label={`Remove ${getProjectName(projectId)}`}
													className="p-0.5 hover:bg-white/20 rounded-full transition-colors"
													data-testid={`remove-project-${projectId}`}
													onClick={() => {
														removeProject(projectId);
													}}
													type="button"
												>
													<X className="size-3" />
												</button>
											)}
										</div>
									))}
								</div>
							)}

							{/* Project Search */}
							{canEdit && (
								<div className="relative" ref={searchRef}>
									<div className="relative">
										<input
											className="w-full px-3 py-2 pr-10 border border-[#e1dfeb] rounded-md font-['Source_Sans_Pro'] text-[16px] text-[#2e2d36] placeholder:text-[#aaa8b9]"
											data-testid="project-search-input"
											onChange={(e) => {
												setSearchQuery(e.target.value);
												setIsProjectSearchOpen(true);
											}}
											onFocus={() => {
												setIsProjectSearchOpen(true);
											}}
											placeholder="Search by Research Project name"
											type="text"
											value={searchQuery}
										/>
										<Search className="absolute right-3 top-1/2 transform -translate-y-1/2 size-4 text-[#636170]" />
									</div>

									{/* Search Results */}
									{isProjectSearchOpen && filteredProjects.length > 0 && (
										<div
											className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e1dfeb] rounded-md shadow-lg z-10 max-h-48 overflow-y-auto"
											data-testid="project-search-results"
										>
											{filteredProjects.map((project) => (
												<button
													className="w-full px-3 py-2 text-left hover:bg-[#f5f5f5] transition-colors font-['Source_Sans_Pro'] text-[14px] text-[#2e2d36]"
													data-testid={`project-option-${project.id}`}
													key={project.id}
													onClick={() => {
														addProject(project.id);
													}}
													type="button"
												>
													{project.name}
												</button>
											))}
										</div>
									)}
								</div>
							)}

							{/* Warning Message */}
							{selectedProjects.length > 0 && (
								<div className="flex items-start gap-2 p-3 bg-[#fff8e1] border border-[#f9cc33] rounded-md">
									<div className="size-4 mt-0.5">
										<svg className="size-4 text-[#f9cc33]" fill="currentColor" viewBox="0 0 20 20">
											<path
												clipRule="evenodd"
												d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
												fillRule="evenodd"
											/>
										</svg>
									</div>
									<div className="flex-1">
										<p className="font-['Source_Sans_Pro'] text-[12px] text-[#b8860b] font-medium">
											Removing research project permission will revoke access. The user will no
											longer be able to view or edit content.
										</p>
									</div>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Actions */}
				<div className="flex items-center gap-3 pt-2">
					<button
						className="px-4 py-2 border border-[#e1dfeb] rounded-md font-['Source_Sans_Pro'] text-[16px] text-[#636170] hover:bg-[#f5f5f5] transition-colors"
						data-testid="cancel-button"
						onClick={handleClose}
						type="button"
					>
						Cancel
					</button>
					<button
						className={`px-4 py-2 rounded-md font-['Source_Sans_Pro'] text-[16px] text-white transition-colors ${
							canEdit && !isSubmitting
								? "bg-[#1e13f8] hover:bg-[#1710d4]"
								: "bg-[#aaa8b9] cursor-not-allowed"
						}`}
						data-testid="update-button"
						disabled={!canEdit || isSubmitting}
						onClick={handleSubmit}
						type="button"
					>
						{isSubmitting ? "Updating..." : "Update"}
					</button>
				</div>
			</div>
		</BaseModal>
	);
}
