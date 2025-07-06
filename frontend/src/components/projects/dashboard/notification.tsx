"use client";

import { BellIcon, X } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const notification = [
	{
		description:
			"Your project “Neuroadaptive Interfaces – EIC Pathfinder” is due in 7 days. Make sure everything is ready for submission.",
		dotColor: "bg-primary",
		id: 1,
		title: "7 days until grant deadline",
	},
	{
		description:
			"Your project “Neuroadaptive Interfaces – EIC Pathfinder” is due in 7 days. Make sure everything is ready for submission.",
		dotColor: "bg-primary",
		id: 2,
		title: "7 days until grant deadline",
	},
	{
		description:
			"Your project “Neuroadaptive Interfaces – EIC Pathfinder” is due in 7 days. Make sure everything is ready for submission.",
		dotColor: "bg-gray-200",
		id: 3,
		title: "7 days until grant deadline",
	},
];
export function Notification() {
	return (
		<div className="size-8 flex items-center justify-center">
			<DropdownMenu>
				<DropdownMenuTrigger className="-mt-2 cursor-pointer relative" data-testid="notification-trigger">
					<BellIcon className="size-4 text-black" />
					<div className="bg-red-500 size-1 rounded-full absolute top-0 left-2.5" />
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					className="w-[428px] rounded-sm bg-white border border-gray-200 shadow-none p-0 transition-all duration-300"
					data-testid="notification-dropdown"
					side="top"
					sideOffset={10}
				>
					{notification.map((item) => (
						<DropdownMenuItem
							className={
								"p-4 font-normal gap-1 text-base text-gray-700 flex flex-col items-start data-[highlighted]:bg-preview-bg data-[highlighted]:text-gray-700  rounded-none border border-gray-200 cursor-pointer"
							}
							data-testid={`notification-item-${item.id}`}
							key={item.id}
						>
							<div className="flex items-center justify-between w-full">
								<div
									className={` size-3 rounded-full ${item.dotColor}`}
									data-testid={`notification-dot-${item.id}`}
								/>
								<div data-testid={`notification-close-${item.id}`}>
									<X className="size-3 text-gray-700" />
								</div>
							</div>
							<p
								className="font-semibold text-base text-black"
								data-testid={`notification-title-${item.id}`}
							>
								{item.title}
							</p>
							<p
								className="text-sm text-gray-600 font-normal"
								data-testid={`notification-description-${item.id}`}
							>
								{item.description}
							</p>
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
