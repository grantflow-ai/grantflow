"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listPredefinedTemplates } from "@/actions/predefined-templates";
import { PredefinedTemplateList } from "@/components/admin/predefined-templates/predefined-template-list";
import { AppButton } from "@/components/app/buttons/app-button";
import { useAdminStore } from "@/stores/admin-store";
import type { API } from "@/types/api-types";
import { routes } from "@/utils/navigation";

export function AdminPredefinedTemplatesContent() {
  const { selectedGrantingInstitutionId } = useAdminStore();
  const [templates, setTemplates] =
    useState<API.ListGrantingInstitutionPredefinedTemplates.Http200.ResponseBody>(
      []
    );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!selectedGrantingInstitutionId) return;

      setIsLoading(true);
      try {
        const result = await listPredefinedTemplates({
          grantingInstitutionId: selectedGrantingInstitutionId,
        });
        setTemplates(result);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTemplates();
  }, [selectedGrantingInstitutionId]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-full"
        data-testid="templates-loading"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-app-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col flex-1 min-h-0 h-full bg-amber-200"
      data-testid="predefined-templates-content"
    >
    
      <div className="bg-app-gray-20 px-8 pt-20 pb-8 flex-1 h-full overflow-y-auto">
     
        {templates.length > 1 ? (
          <PredefinedTemplateList templates={templates} />
        ) : (
         <div className="flex flex-col space-y-6 items-center ">
          <div className="text-center space-y-2">
            <h1 className="font-cabin text-[28px] font-medium text-app-black">
              Create Predefined Template
            </h1>
            <p className="font-sans text-xs font-normal text-app-gray-600">
              Define a reusable grant template synced with catalog guidelines.
            </p>
          </div>
          <Link
            href={routes.admin.grantingInstitutions.predefinedTemplates.new()}
          >
            <AppButton
              data-testid="predefined-template-create-button"
              size="lg"
            >
              Create template
            </AppButton>
          </Link>
        </div>
        )}
      </div>
    </div>
  );
}
