"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  createGrantingInstitution,
  deleteGrantingInstitution,
  updateGrantingInstitution,
} from "@/actions/granting-institutions";
import {
  AppDialog,
  AppDialogContent,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
} from "@/components/app/app-dialog";
import { AppButton } from "@/components/app/buttons/app-button";
import { AppInput } from "@/components/app/fields/app-input";
import type { API } from "@/types/api-types";
import { drop } from "@/utils/helpers";
import { log } from "@/utils/logger/client";
import { routes } from "@/utils/navigation";

interface GrantingInstitutionFormProps {
  institution?: API.ListGrantingInstitutions.Http200.ResponseBody[0];
  mode: "create" | "edit";
}

export function GrantingInstitutionForm({
  institution,
  mode,
}: GrantingInstitutionFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState(institution?.full_name ?? "");
  const [abbreviation, setAbbreviation] = useState(
    institution?.abbreviation ?? ""
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [errors, setErrors] = useState<{
    abbreviation?: string;
    fullName?: string;
  }>({});

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
      router.replace(routes.admin.grantingInstitutions.list());
    } catch (error) {
      log.error("Failed to save granting institution:", error);
      const errorMessage =
        mode === "create"
          ? "Failed to create granting institution. Please try again."
          : "Failed to update granting institution. Please try again.";
      toast.error(errorMessage);
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
      <div className="flex flex-col gap-3 ">
        <h3 className="font-semibold text-base font-sans leading-[22px] text-app-black">
          Institution name
        </h3>
        <AppInput
          aria-describedby={errors.fullName ? "full_name-error" : undefined}
          aria-invalid={!!errors.fullName}
          className={`w-full h-10 px-3 border rounded-[4px] bg-white! text-sm font-sans text-app-gray-600 placeholder:text-app-gray-400 font-normal border-app-gray-600  focus:outline-none ${
            errors.fullName
              ? "border-error focus:border-error"
              : "border-app-gray-600 focus:border-primary"
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
          <p className="text-sm text-error" id="full_name-error">
            {errors.fullName}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 w-[340px]">
        <h3 className="font-semibold text-base font-sans leading-[22px] text-app-black">
          Abbreviation
        </h3>
        <AppInput
          aria-describedby={
            errors.abbreviation ? "abbreviation-error" : undefined
          }
          aria-invalid={!!errors.abbreviation}
          className={`w-full h-10 px-3 border rounded-[4px] bg-white! text-sm font-sans text-app-gray-600 placeholder:text-app-gray-400 font-normal border-app-gray-600  focus:outline-none${
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
          <p className="text-sm text-error" id="abbreviation-error">
            {errors.abbreviation}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between pt-4 w-[340px]">
        <div>
          {mode === "edit" && (
            <AppButton
              className=" px-4 py-2 font-sora text-[18px] font-normal  rounded-[4px] bg-red hover:bg-red/85"
              data-testid="delete-button"
              disabled={isLoading}
              onClick={() => {
                setShowDeleteDialog(true);
              }}
              type="button"
            >
              <Trash2 className="mr-2 size-4" />
              Delete Institution
            </AppButton>
          )}
        </div>
      </div>

      <AppDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AppDialogContent className="w-fit min-w-[464px] rounded outline-1 flex flex-col gap-8  outline-primary p-8 border-0">
          <AppDialogHeader>
            <AppDialogTitle className="text-app-black text-2xl font-medium font-cabin ">
              Are you sure you want to delete this institution?
            </AppDialogTitle>
            <AppDialogDescription className="text-app-black text-base font-normal leading-tight">
              Deleting the institution will permanently remove all its
              <br /> sources and templates.
              <br />
              This action cannot be undone.
            </AppDialogDescription>
          </AppDialogHeader>
          <AppDialogFooter className="flex w-full justify-between sm:justify-between">
			
            <AppButton
			className="px-4 py-2 rounded-[4px] font-sora text-base "
              disabled={isLoading}
              onClick={() => {
                setShowDeleteDialog(false);
              }}
              type="button"
              variant="secondary"
            >
              Cancel
            </AppButton>
            <AppButton
			className="px-4 py-2 rounded-[4px] font-sora text-base "
              disabled={isLoading}
              onClick={handleDelete}
              type="button"
              variant="primary"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AppButton>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
    </form>
  );
}
