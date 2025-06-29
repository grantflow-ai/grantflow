"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BellIcon, X } from "lucide-react";

interface NotificationProps {
  // Define your component's props here
}
const notification = [
	   {
    id: 1,
    title: "7 days until grant deadline",
    description: "Your project “Neuroadaptive Interfaces – EIC Pathfinder” is due in 7 days. Make sure everything is ready for submission.",
    dotColor: "bg-white",
  },
  {
    id: 2,
    title: "7 days until grant deadline",
    description: "Your project “Neuroadaptive Interfaces – EIC Pathfinder” is due in 7 days. Make sure everything is ready for submission.",
    dotColor: "bg-preview-bg",
  },
  {
    id: 3,
    title: "7 days until grant deadline",
    description: "Your project “Neuroadaptive Interfaces – EIC Pathfinder” is due in 7 days. Make sure everything is ready for submission.",
    dotColor: "bg-white",
  },
]
export function Notification({}: NotificationProps) {
  return (
    <div className="size-8 flex items-center justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger className="-mt-2 cursor-pointer relative">
          <BellIcon className="size-4 text-black" />
		  <div className="bg-red-500 size-1 rounded-full absolute top-0 left-2.5"></div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="end"
          sideOffset={10}
          className="w-[428px] rounded-sm bg-white border border-gray-200 shadow-none p-0 transition-all duration-300"
        >
    {notification.map((item)=>(
		<DropdownMenuItem key={item.id} className={`p-4 font-normal gap-1 text-base text-gray-700 flex flex-col items-start data-[highlighted]:bg-transparent data-[highlighted]:text-gray-700 ${item.dotColor}  hover:bg-gray-50 rounded-none border border-gray-200 cursor-pointer`}>
			<div className="flex items-center justify-between w-full">
				<div className={`bg-primary size-3 rounded-full ${item.dotColor}`}></div>
				<div>
					<X className="size-3 text-gray-700" />
				</div>
			</div>
			<p className="font-semibold text-base text-black ">
				{item.title}
			</p>
			<p className="text-sm text-gray-600 font-normal">
				{item.description}
			</p>
		</DropdownMenuItem>
	))}
         
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
