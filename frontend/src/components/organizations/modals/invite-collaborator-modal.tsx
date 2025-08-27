"use client";

import { Mail, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppButton } from "@/components/app/buttons/app-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { API } from "@/types/api-types";

export interface InviteOptions {
	email: string;
	hasAllProjectsAccess?: boolean;
	projectIds?: string[];
	role: CollaboratorPermission;
}
type CollaboratorPermission = Exclude<API.CreateOrganizationInvitation.RequestBody["role"], "OWNER">;

interface InviteCollaboratorModalProps {
	isOpen: boolean;
	onClose: () => void;
	onInvite: (options: InviteOptions) => Promise<void>;
	ownerEmail?: string
	projects: ResearchProject[];
}

interface ResearchProject {
	id: string;
	name: string;
}

export function InviteCollaboratorModal({ isOpen, onClose, onInvite, ownerEmail, projects = [] }: InviteCollaboratorModalProps) {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [emailError, setEmailError] = useState<null | string>(null)
	const [permission, setPermission] = useState<CollaboratorPermission>();
	const [projectAccess, setProjectAccess] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

	const handleSubmit = async () => {

		if (!(email && permission)) return;

		setIsSubmitting(true);
		try {
			let hasAllProjectsAccess = false;
			let projectIds: string[] = [];

			if (permission === "ADMIN") {
				hasAllProjectsAccess = true;
				projectIds = projects.map((project) => project.id);
			} else {
				projectIds = selectedProjects;
			}

			await onInvite({
				email,
				hasAllProjectsAccess,
				projectIds,
				role: permission,
			});

			setName("");
			setEmail("");
			setPermission(undefined);
			setProjectAccess("");
			setSelectedProjects([]);
			onClose();
		} catch {
			toast.error("Failed to invite collaborator. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		setName("");
		setEmail("");
		setPermission(undefined);
		setSelectedProjects([]);
		onClose();
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			handleClose();
		}
	};

	const handleRemoveProject = (projectId: string) => {
		setSelectedProjects(selectedProjects.filter((id) => id !== projectId));
	};

	const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) =>{
const newEmail = e.target.value
setEmail(newEmail)

if(ownerEmail && newEmail === ownerEmail){
	setEmailError("The user is already the owner of the organization.");
}else {
	setEmailError(null)
}
	}
	return (
		<Dialog onOpenChange={handleOpenChange} open={isOpen}>
			<DialogContent
				className="w-[464px] p-0 bg-white border border-primary rounded-[8px] overflow-hidden"
				data-testid="invite-collaborator-modal"
			>
				<div className="p-8 flex flex-col gap-8">
					<div className="flex items-start justify-between">
						<div className="flex flex-col gap-1">
							<DialogTitle className="font-cabin font-medium text-2xl leading-[30px] text-app-black">
								Invite New Member
							</DialogTitle>
							<DialogDescription className="font-body text-base font-normal text-app-gray-600">
								Invite new member and set up member role.
							</DialogDescription>
						</div>
						<button
							className="p-0 hover:bg-app-gray-50 rounded transition-colors"
							onClick={handleClose}
							type="button"
						>
							<X className="size-4 text-app-gray-700" />
						</button>
					</div>

					<div className="flex flex-col gap-6">
						<div className="flex flex-col">
							<label className="font-body text-xs font-normal text-app-gray-400" htmlFor="member-name">
								Name
							</label>
							<input
								className="w-full h-10 px-3 border border-app-gray-400 rounded bg-white font-body text-sm text-app-gray-600 placeholder:text-app-gray-400 outline-none focus:border-primary"
								data-testid="name-input"
								id="member-name"
								onChange={(e) => {
									setName(e.target.value);
								}}
								placeholder="Member Name"
								type="text"
								value={name}
							/>
						</div>

						<div className="flex flex-col">
							<label className="font-body text-xs font-normal text-app-gray-400" htmlFor="member-email">
								Email address
							</label>
							<div className="relative">
								<input
									className={`w-full h-10 px-3 border rounded bg-white font-body text-sm text-app-gray-600 placeholder:text-app-gray-400 outline-none focus:border-primary ${
										emailError ? "border-red-500" : "border-app-gray-400"
									}`}
									data-testid="email-input"
									id="member-email"
									onChange={handleEmailChange}
									placeholder="Type here the member email"
									type="email"
									value={email}
								/>
								<Mail className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-app-gray-600" />
							</div>
							{emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
						</div>

						<h4 className="font-cabin text-app-black font-semibold text-base">Permission and access</h4>

						<div className="flex flex-col">
							<label
								className="font-body text-xs font-normal text-app-gray-400"
								htmlFor="member-permission"
							>
								Permission
							</label>
							<Select
								onValueChange={(value) => {
									setPermission(value as CollaboratorPermission);
								}}
								value={permission}
							>
								<SelectTrigger
									className="w-full h-10 px-3 border border-app-gray-300 rounded bg-white font-body text-sm text-app-gray-600 outline-none"
									data-testid="permission-dropdown"
									id="member-permission"
								>
									<div className="flex-1 text-left">
										<SelectValue placeholder="Select a role (e.g., Admin, Editor, Collaborator)" />
									</div>
								</SelectTrigger>
								<SelectContent
									className="border border-app-gray-200 bg-white"
									data-testid="permission-dropdown-menu"
								>
									<SelectItem
										className="px-3 py-2 cursor-pointer  text-app-black text-[14px]"
										data-testid="collaborator-option"
										value="COLLABORATOR"
									>
										Collaborator
									</SelectItem>
									<SelectItem
										className="px-3 py-2 cursor-pointer text-app-black text-[14px]"
										data-testid="admin-option"
										value="ADMIN"
									>
										Admin
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="flex flex-col gap-2">
							<div className="flex flex-wrap items-center gap-2">
								{selectedProjects.map((projectId) => {
									const project = projects.find((p) => p.id === projectId);
									if (!project) return null;

									return (
										<div
											className="flex items-center gap-1 px-2
      py-1 bg-secondary rounded-[20px] text-white text-[12px]
      font-body"
											key={project.id}
										>
											<button
												className="p-0 text-white"
												onClick={() => {
													handleRemoveProject(project.id);
												}}
												type="button"
											>
												<X className="size-3" />
											</button>
											<span> {project.name}</span>
										</div>
									);
								})}
							</div>
							<div>
								<label
									className="font-body text-xs font-normal text-app-gray-400"
									htmlFor="project-access"
								>
									Research Projects Access
								</label>
								<Select
									onValueChange={(projectId) => {
										if (projectId && !selectedProjects.includes(projectId)) {
											setSelectedProjects([...selectedProjects, projectId]);
										}
									}}
									value={projectAccess}
								>
									<SelectTrigger
										className="w-full h-10 px-3 border border-app-gray-300 rounded bg-white font-body text-[14px] text-app-gray-600 outline-none data-[state=open]:border-primary [&_svg]:opacity-100 [&_[data-placeholder]]:!text-black"
										data-testid="project-access-dropdown"
										id="project-access"
									>
										<div className="flex-1 text-left">
											<span className={selectedProjects.length === 0 ? "text-app-gray-400" : ""}>
												{selectedProjects.length > 0
													? `${selectedProjects.length} project(s)
      selected`
													: "Choose specific projects or grant access to all"}
											</span>
										</div>
									</SelectTrigger>
									<SelectContent className="border border-app-gray-200 bg-white">
										{projects.map((project) => (
											<SelectItem
												className="px-3 py-2 cursor-pointer text-app-black text-[14px]"
												key={project.id}
												onSelect={(e) => {
													e.preventDefault();
												}}
												value={project.id}
											>
												<div className="flex gap-1 items-center">
													<Checkbox
														checked={selectedProjects.includes(project.id)}
														className="size-3 hover:border-white"
														id={project.id}
													/>

													<label htmlFor={project.id}>{project.name}</label>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<AppButton
							className="px-4 py-2"
							data-testid="cancel-button"
							onClick={handleClose}
							variant="secondary"
						>
							Cancel
						</AppButton>
						<AppButton
							className=" px-4 py-2 "
							data-testid="send-invitation-button"
							disabled={!(email && permission) || isSubmitting || emailError !== null}
							onClick={handleSubmit}
							type="button"
							variant="primary"
						>
							{isSubmitting ? "Inviting..." : "Invite"}
						</AppButton>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
