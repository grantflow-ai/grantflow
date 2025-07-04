"use client";

import { Plus } from "lucide-react";

import { AvatarGroup } from "@/components/app";

import { Notification } from "./notification"


interface DashboardHeaderProps {
	
	projectTeamMembers:{
		backgroundColor:string;
		initials:string;
	}[]
}



export function DashboardHeader({ projectTeamMembers  }: DashboardHeaderProps) {
	return (
		
		<>
		 <header className=" h-[73px] w-full flex justify-end items-center gap-2">
            <div className="size-8 flex items-center justify-center">
     
              <Notification/>
            </div>
            <div className="flex items-center   ">
              <AvatarGroup size="md" users={projectTeamMembers} className="border-0 rounded-none" />
            </div>
          </header>
		</>
	);
}
