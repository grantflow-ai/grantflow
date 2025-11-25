"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminGrantingInstitutionLayout } from "@/components/admin/layout/admin-granting-institution-layout";
import { AdminBreadcrumb } from "@/components/admin/shared/admin-breadcrumb";
import { type GrantingInstitutionTab, TAB_LABELS } from "@/constants/admin";
import { useAdminStore } from "@/stores/admin-store";
import { routes } from "@/utils/navigation";
import AppHeader from "@/components/layout/app-header";
import Image from "next/image";

interface AdminGrantingInstitutionClientProps {
  activeTab: GrantingInstitutionTab;
  children: React.ReactNode;
  projectTeamMembers?: {
    backgroundColor: string;
    imageUrl?: string;
    initials: string;
  }[];
}

export function AdminGrantingInstitutionClient({
  activeTab,
  children,
  projectTeamMembers,
}: AdminGrantingInstitutionClientProps) {
  const router = useRouter();
  const {
    getGrantingInstitution,
    grantingInstitution,
    selectedGrantingInstitutionId,
  } = useAdminStore();

  useEffect(() => {
    if (!selectedGrantingInstitutionId) {
      router.replace(routes.admin.grantingInstitutions.list());
      return;
    }

    void getGrantingInstitution(selectedGrantingInstitutionId);
  }, [selectedGrantingInstitutionId, router, getGrantingInstitution]);

  if (!grantingInstitution) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-preview-bg">
        <div className="text-app-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-preview-bg overflow-hidden">
      <div className="flex-none">
        <AppHeader
          data-testid="dashboard-header"
          projectTeamMembers={projectTeamMembers}
        />
      </div>
      
      <div className="mb-4 2xl:mb-6 px-6 2l:px-10 relative flex flex-1 flex-col gap-4 2xl:gap-10 py-6 2xl:py-8 rounded-[8px] mr-5 bg-white border border-app-gray-100 overflow-hidden min-h-0">
        <div className="flex flex-col h-full relative">
          <main
            className="space-y-8 flex-1 flex flex-col min-h-0"
            data-testid="admin-granting-institution-container"
          >
            <AdminBreadcrumb
              institutionName={grantingInstitution.full_name}
              tabLabel={TAB_LABELS[activeTab]}
            />

            <div className="space-y-6 flex-1 flex flex-col min-h-0">
              <header data-testid="admin-granting-institution-header">
                <div className="flex items-center gap-2">
                  <div className="size-8 flex justify-center items-center">
                    <Image
                      alt="Account Balance Icon"
                      className="your-custom-tailwind-classes"
                      height={26.67}
                      src="/icons/account_balance.svg"
                      width={26.67}
                    />
                  </div>
                  <h1 className="font-medium text-[36px] leading-[42px] text-app-black">
                    {grantingInstitution.full_name}
                  </h1>
                  <div>
                    {grantingInstitution.abbreviation && (
                      <div className="bg-app-slate-blue rounded-[4px] px-2 py-0.5 w-fit text-base font-semibold text-white font-sans">
                        {grantingInstitution.abbreviation}
                      </div>
                    )}
                  </div>
                </div>
              </header>

              <div
                className="flex-1 min-h-0 flex flex-col"
                data-testid="admin-granting-institution-main-content"
              >
                <AdminGrantingInstitutionLayout
                  activeTab={activeTab}
                  institutionId={grantingInstitution.id}
                >
                  {children}
                </AdminGrantingInstitutionLayout>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
