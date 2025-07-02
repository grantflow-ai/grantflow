

import { ChevronRight } from "lucide-react";

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

export function NavProjects() {
  return (
    <SidebarGroup>
       <SidebarMenu>

      <Collapsible  className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="bg-white text-blue-600 hover:bg-gray-100 hover:text-blue-700">
              <div className="size-4 bg-red-500">

              </div>
              <span>My Workspace</span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-2 space-y-2">
             
              <main className="flex flex-col gap-4">

              <div className="p-2 rounded-md bg-gray-50 flex flex-col gap-1">

                <p className="text-sm text-gray-700 font-normal">Account Setting </p>
              </div>
              <div className="p-2 rounded-md bg-gray-50 flex flex-col gap-1">
              
                <p className="text-sm text-gray-700 font-normal">Billing and payments</p>
              </div>
              <div className="p-2 rounded-md bg-gray-50 flex flex-col gap-1">

                <p className="text-sm text-gray-700 font-normal">Members</p>
              </div>
              <div className="p-2 rounded-md bg-gray-50 flex flex-col gap-1">
                
                <p className="text-sm text-gray-700 font-normal">Notifications</p>
              </div>
             
              
              </main>
          
            </div>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
       </SidebarMenu>
    </SidebarGroup>
  );
}
