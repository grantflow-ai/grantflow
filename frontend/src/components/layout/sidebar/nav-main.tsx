import { Bot, ChevronRight, Search, Settings, SquareTerminal } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
} from "@/components/ui/sidebar";
import Image from "next/image";

export function NavMain(props: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <nav {...props}>
   <main data-testid="dashboard-section" className="flex px-3 items-center pl-12 pb-6 group-data-[collapsible=icon]:pl-3 group-data-[collapsible=icon]:justify-center">
        <div className="size-4">
          <Image src="/icons/dashboard.svg" alt="logo" width={16} height={16} className="w-full h-full object-cover" />
        </div>
        <p className="text-black text-base font-normal ml-2 group-data-[collapsible=icon]:hidden">Dashboard</p>
      </main>
    <SidebarGroup>
      <SidebarMenu>
        {/* Recent Applications */}
        <Collapsible defaultOpen className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton data-testid="recent-applications-trigger" className="bg-white text-primary hover:bg-gray-100 hover:text-blue-700 font-normal text-base border border-gray-200 ">
                  <div className="size-4 flex-shrink-0">
                    <Image
                      src="/icons/note-stack-blue.svg"
                      alt="Recent Applications"
                      width={16}
                      height={16}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="group-data-[collapsible=icon]:hidden">Recent Applications</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 group-data-[collapsible=icon]:hidden">
                <div data-testid="recent-app-item"  className="flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                    data-testid="search-input"
                      placeholder="Search application"
                      className="px-3 rounded-sm border border-gray-100 bg-white placeholder:text-sm placeholder:font-normal placeholder:text-gray-400"
                    />
                  </div>
                  <main className="flex flex-col gap-4 h-[286px] overflow-y-scroll">
                    <div className="p-2 rounded-md bg-gray-50 flex flex-col gap-1">
                      <div className="rounded-md flex items-center bg-primary w-fit gap-0.5 px-[4.39px]">
                        <div className="size-[6px] bg-white rounded-full"></div>
                        <p className="text-[6.59px] text-white font-normal">Generating</p>
                      </div>
                      <p className="text-sm text-gray-700 font-normal">Application name 123456...</p>
                    </div>
                    <div className="p-2 rounded-md flex flex-col gap-1">
                      <div className="rounded-md flex items-center bg-gray-100 w-fit gap-0.5 px-[4.39px]">
                        <div className="size-[6px] bg-blue-600 rounded-full"></div>
                        <p className="text-[6.59px] text-blue-600 font-normal">In Progress</p>
                      </div>
                      <p className="text-sm text-gray-700 font-normal">Application name 123456...</p>
                    </div>
                    <div className="p-2 rounded-md flex flex-col gap-1">
                      <div className="rounded-md flex items-center bg-slate-100 w-fit gap-0.5 px-[4.39px]">
                        <div className="size-[6px] bg-slate-600 rounded-full"></div>
                        <p className="text-[6.59px] text-slate-600 font-normal">Working Draft</p>
                      </div>
                      <p className="text-sm text-gray-700 font-normal">Application name 123456...</p>
                    </div>
                    <div className="p-2 rounded-md flex flex-col gap-1">
                      <div className="rounded-md flex items-center bg-slate-100 w-fit gap-0.5 px-[4.39px]">
                        <div className="size-[6px] bg-slate-600 rounded-full"></div>
                        <p className="text-[6.59px] text-slate-600 font-normal">Working Draft</p>
                      </div>
                      <p className="text-sm text-gray-700 font-normal">Application name 123456...</p>
                    </div>
                    <div className="p-2 rounded-md bg-gray-50 flex flex-col gap-1">
                      <div className="rounded-md flex items-center bg-slate-100 w-fit gap-0.5 px-[4.39px]">
                        <div className="size-[6px] bg-slate-600 rounded-full"></div>
                        <p className="text-[6.59px] text-slate-600 font-normal">Working Draft</p>
                      </div>
                      <p className="text-sm text-gray-700 font-normal">Application name 123456...</p>
                    </div>
                  </main>
                </div>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>

    
        {/* Settings */}
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton data-testid="settings-trigger" className="bg-white text-primary hover:bg-gray-100 hover:text-blue-700 font-normal text-base border border-gray-200 ">
                  <Settings className="text-primary size-4 flex-shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 group-data-[collapsible=icon]:hidden">
                <main className="flex flex-col gap-4 px-3">
                  <div data-testid="settings-account" className="hover:bg-gray-50 p-2 rounded-md cursor-pointer transition-colors">
                    <p className="text-sm text-gray-700 font-normal">Account Setting</p>
                  </div>
                  <div data-testid="settings-billing" className="hover:bg-gray-50 p-2 rounded-md cursor-pointer transition-colors">
                    <p className="text-sm text-gray-700 font-normal">Billing and payments</p>
                  </div>
                  <div data-testid="settings-members" className="hover:bg-gray-50 p-2 rounded-md cursor-pointer transition-colors">
                    <p className="text-sm text-gray-700 font-normal">Members</p>
                  </div>
                  <div data-testid="settings-notifications" className="hover:bg-gray-50 p-2 rounded-md cursor-pointer transition-colors">
                    <p className="text-sm text-gray-700 font-normal">Notifications</p>
                  </div>
                </main>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
    </nav>

  );
}
