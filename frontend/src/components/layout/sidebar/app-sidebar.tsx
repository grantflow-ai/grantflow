"use client";

import * as React from "react";
import { HelpCircle, LogOut, Plus } from "lucide-react";

import { AppButton } from "@/components/app";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";

import Image from "next/image";
import { CustomSidebarTrigger } from "./customer-trigger";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="flex h-full flex-col border-r"
    >
      <SidebarHeader className="flex flex-col gap-8  p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className=" size-[31px]">
              <Image
                src="/assets/logo-horizontal.svg"
                alt="logo"
                width={100}
                height={100}
                className="w-full h-full object-cover"
                 data-testid="sidebar-logo"
              />
            </div>
            <h2 className="text-xl font-semibold group-data-[collapsible=icon]:hidden" data-testid="sidebar-title">
              GrantFlow
            </h2>
          </div>
		   <div className="group-data-[collapsible=icon]:hidden">
            <CustomSidebarTrigger data-testid="sidebar-trigger" />
          </div>
        </div>
		 <div className="hidden group-data-[collapsible=icon]:flex justify-center mt-2">
          <CustomSidebarTrigger   />
        </div>
        <AppButton className="w-full justify-center gap-x-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 " data-testid="new-application-button">
          <Plus className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">
            New Application
          </span>
        </AppButton>
      </SidebarHeader>

      <SidebarContent className="flex-grow gap-0  py-4">
        <NavMain data-testid="nav-main" />
       
      </SidebarContent>

      <SidebarFooter >
          <div className="flex flex-col gap-1">
          <SidebarMenuButton data-testid="support-button" className="w-full justify-start gap-3 text-black hover:bg-gray-100 group-data-[collapsible=icon]:justify-center">
            <HelpCircle className="h-5 w-5 flex-shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">Support</span>
          </SidebarMenuButton>
          <SidebarMenuButton data-testid="logout-button" className="w-full justify-start gap-3 text-black hover:bg-gray-100 group-data-[collapsible=icon]:justify-center">
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">Logout</span>
          </SidebarMenuButton>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
