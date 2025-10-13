"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	createGrantingInstitution,
	deleteGrantingInstitution,
	updateGrantingInstitution,
} from "@/actions/granting-institutions";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { API } from "@/types/api-types";
import { routes } from "@/utils/navigation";

interface GrantingInstitutionFormProps {
	institution?: API.ListGrantingInstitutions.Http200.ResponseBody[0];
	mode: "create" | "edit";
}

export function GrantingInstitutionForm({ institution, mode }: GrantingInstitutionFormProps) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [fullName, setFullName] = useState(institution?.full_name ?? "");
	const [abbreviation, setAbbreviation] = useState(institution?.abbreviation ?? "");
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [errors, setErrors] = useState<{ abbreviation?: string; fullName?: string }>({});

	const validateForm = (): boolean => {
		const newErrors: { abbreviation?: string; fullName?: string } = {};

		const trimmedFullName = fullName.trim();
		if (!trimmedFullName) {
			newErrors.fullName = "Full name is required";
		} else if (trimmedFullName.length < 2) {
			newErrors.fullName = "Full name must be at least 2 characters";
		} else if (trimmedFullName.length > 200) {
			newErrors.fullName = "Full name must not exceed 200 characters";
		}

		const trimmedAbbreviation = abbreviation.trim();
		if (trimmedAbbreviation && trimmedAbbreviation.length > 50) {
			newErrors.abbreviation = "Abbreviation must not exceed 50 characters";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setIsLoading(true);
		setErrors({});

		try {
			const trimmedFullName = fullName.trim();
			const trimmedAbbreviation = abbreviation.trim();

			if (mode === "create") {
				await createGrantingInstitution({
					abbreviation: trimmedAbbreviation || null,
					full_name: trimmedFullName,
				});
				toast.success("Granting institution created successfully");
			} else {
				if (!institution?.id) {
					throw new Error("Institution ID is required for update");
				}
				await updateGrantingInstitution(institution.id, {
					abbreviation: trimmedAbbreviation || null,
					full_name: trimmedFullName,
				});
				toast.success("Granting institution updated successfully");
			}
			router.push(routes.admin.grantingInstitutions.list());
			router.refresh();
		} catch {
			const errorMessage =
				mode === "create"
					? "Failed to create granting institution. Please try again."
					: "Failed to update granting institution. Please try again.";
			toast.error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!institution?.id) return;

		setIsLoading(true);
		try {
			await deleteGrantingInstitution(institution.id);
			toast.success("Granting institution deleted successfully");
			setShowDeleteDialog(false);
			router.push(routes.admin.grantingInstitutions.list());
			router.refresh();
		} catch {
			toast.error("Failed to delete granting institution");
			setIsLoading(false);
		}
	};

	return (
		<form className="flex flex-col gap-6" onSubmit={handleSubmit}>
			<div className="flex flex-col gap-3 w-[340px]">
				<h3 className="font-semibold text-[16px] leading-[22px] text-app-black">
					Full Name <span className="text-error">*</span>
				</h3>
				<input
					aria-describedby={errors.fullName ? "full_name-error" : undefined}
					aria-invalid={!!errors.fullName}
					className={`w-full h-10 px-3 border rounded bg-white text-[14px] font-body text-app-gray-600 placeholder:text-app-gray-400 focus:outline-none ${
						errors.fullName ? "border-error focus:border-error" : "border-app-gray-300 focus:border-primary"
					} ${isLoading ? "opacity-60 cursor-not-allowed" : ""}`}
					data-testid="full-name-input"
					disabled={isLoading}
					id="full_name"
					maxLength={200}
					onChange={(e) => {
						setFullName(e.target.value);
						if (errors.fullName) {
							setErrors((prev) => ({ ...prev, fullName: undefined }));
						}
					}}
					placeholder="Enter full institution name"
					type="text"
					value={fullName}
				/>
				{errors.fullName ? (
					<p className="text-[14px] text-error" id="full_name-error">
						{errors.fullName}
					</p>
				) : null}
			</div>

			<div className="flex flex-col gap-3 w-[340px]">
				<h3 className="font-semibold text-[16px] leading-[22px] text-app-black">Abbreviation</h3>
				<input
					aria-describedby={errors.abbreviation ? "abbreviation-error" : undefined}
					aria-invalid={!!errors.abbreviation}
					className={`w-full h-10 px-3 border rounded bg-white text-[14px] font-body text-app-gray-600 placeholder:text-app-gray-400 focus:outline-none ${
						errors.abbreviation
							? "border-error focus:border-error"
							: "border-app-gray-300 focus:border-primary"
					} ${isLoading ? "opacity-60 cursor-not-allowed" : ""}`}
					data-testid="abbreviation-input"
					disabled={isLoading}
					id="abbreviation"
					maxLength={50}
					onChange={(e) => {
						setAbbreviation(e.target.value);
						if (errors.abbreviation) {
							setErrors((prev) => ({ ...prev, abbreviation: undefined }));
						}
					}}
					placeholder="Enter abbreviation (optional)"
					type="text"
					value={abbreviation}
				/>
				{errors.abbreviation ? (
					<p className="text-[14px] text-error" id="abbreviation-error">
						{errors.abbreviation}
					</p>
				) : null}
			</div>

			<div className="flex items-center justify-between pt-4 w-[340px]">
				<div>
					{mode === "edit" && (
						<button
							className="cursor-pointer flex items-center gap-1 px-2 py-1 border border-error rounded bg-white text-error text-[14px] font-button hover:bg-error hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							data-testid="delete-button"
							disabled={isLoading}
							onClick={() => {
								setShowDeleteDialog(true);
							}}
							type="button"
						>
							Delete
						</button>
					)}
				</div>
				<div className="flex gap-3">
					<button
						className="px-4 py-2 border border-app-gray-300 rounded bg-white text-app-black text-[14px] font-button hover:bg-app-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						data-testid="cancel-button"
						disabled={isLoading}
						onClick={() => {
							router.back();
						}}
						type="button"
					>
						Cancel
					</button>
					<button
						className="px-4 py-2 border border-primary rounded bg-primary text-white text-[14px] font-button hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						data-testid="submit-button"
						disabled={isLoading}
						type="submit"
					>
						{(() => {
							if (isLoading) return "Saving...";
							return mode === "create" ? "Create" : "Update";
						})()}
					</button>
				</div>
			</div>

			<Dialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Granting Institution</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete &ldquo;{institution?.full_name}&rdquo;? This action cannot
							be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button disabled={isLoading} type="button" variant="outline">
								Cancel
							</Button>
						</DialogClose>
						<Button disabled={isLoading} onClick={handleDelete} type="button" variant="destructive">
							{isLoading ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</form>
	);
}
