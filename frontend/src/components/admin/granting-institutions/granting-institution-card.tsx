import { format } from "date-fns";

import Image from "next/image";
import { CardActionMenu } from "@/components/organizations/dashboard/card-action-menu";
import { cn } from "@/lib/utils";
import type { API } from "@/types/api-types";

interface GrantingInstitutionCardProps {
  institution: API.ListGrantingInstitutions.Http200.ResponseBody[0];
  isSelected?: boolean;
  onDelete: (id: string) => void;
  onView: (id: string, name: string) => void;
}

export function GrantingInstitutionCard({
  institution,
  isSelected = false,
  onDelete,
  onView,
}: GrantingInstitutionCardProps) {
  return (
    <div
      className={cn(
        "relative flex  flex-col rounded-[4px] space-y-6 border  p-6 bg-preview-bg transition-all",
        isSelected
          ? "border-primary border-2 ring-2 ring-primary ring-opacity-20"
          : "border-app-gray-100 hover:border-primary hover:border-2",
        "cursor-pointer" // New: Add cursor-pointer class
      )}
      data-testid={`granting-institution-card-${institution.id}`}
      onClick={() => onView(institution.id, institution.full_name)} // New: Add onClick handler
    >
      <header className="flex flex-col gap-3 ">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-sans  font-normal text-app-gray-500">
              Last edited {format(new Date(institution.updated_at), "dd.MM.yy")}
            </p>
          </div>

          <div className="flex items-center pt-2 gap-3 ">
            <CardActionMenu
              onDelete={() => {
                onDelete(institution.id);
              }}
            />
          </div>
        </div>
      </header>
      <main className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="size-4 flex items-center justify-center">
            <Image
              src="/icons/account_balance.svg"
              width={13.33}
              height={13.33}
              alt="Institution"
            />
          </div>
          <h3
            className="text-base font-cabin font-semibold leading-[22px] text-app-black"
            data-testid={`granting-institution-card-name-${institution.id}`}
          >
            {institution.full_name}
          </h3>
        </div>

        {institution.abbreviation && (
          <div className="flex space-x-1">
            <p className="font-normal text-[14px] font-sans text-app-black">
              {" "}
              Abbreviation:
            </p>
            <p
              className="text-sm font-normal leading-[18px] text-app-gray-600"
              data-testid={`granting-institution-card-abbreviation-${institution.id}`}
            >
              {institution.abbreviation}
            </p>
          </div>
        )}

        {institution.activity_code && (
          <div className="flex space-x-1">
            <p className="font-normal text-[14px] font-sans text-app-black">
              Activity code:
            </p>
            <p
              className="text-sm font-normal leading-[18px] text-app-gray-600"
              data-testid={`granting-institution-card-activity-code-${institution.id}`}
            >
              {institution.activity_code}
            </p>
          </div>
        )}
      </main>

      <main className="flex h-full w-full ">
        <div className="flex gap-2">
          <div className="w-fit bg-[#DEDDFD] px-1 py-0.5 flex gap-1 rounded-[4px] items-center">
            <div className="size-3.5 flex items-center justify-center">
              <Image
                src="/icons/source.svg"
                width={11.08}
                height={12.83}
                alt="Source"
              />
            </div>
            <span className="text-sm font-normal  font-sans text-black">
              {institution.source_count}
              <span className="ml-1 ">
                {institution.source_count === 1 ? "Source" : "Sources"}
              </span>
            </span>
          </div>
          <div className="w-fit bg-[#DEDDFD] px-1 py-[2px] flex gap-1 rounded-[4px] items-center">
            <div className="size-3.5 flex items-center justify-center">
              <Image
                src="/icons/template.svg"
                width={9.33}
                height={11.67}
                alt="Template"
              />
            </div>
            <span className="text-sm font-normal  font-sans text-black">
              {institution.template_count}
              <span className="ml-1 ">
                {institution.template_count === 1 ? "Template" : "Templates"}
              </span>
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2"></div>
      </main>
    </div>
  );
}
