"use client";

import { Copy, MoreVertical, Trash2 } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CardActionMenuProps {
	onDelete?: () => void;
	onDuplicate?: () => void;
}

export function CardActionMenu({ onDelete, onDuplicate }: CardActionMenuProps) {
	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger
				className="-mt-2 cursor-pointer"
				onClick={(e) => {
					e.stopPropagation();
				}}
			>
				<MoreVertical className="size-4 text-gray-700" />
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-[200px] rounded-sm bg-white border border-gray-200 shadow-none p-1">
				{onDelete && (
					<DropdownMenuItem
						className="p-3 font-normal text-base text-gray-700 flex items-center gap-2 cursor-pointer data-[highlighted]:bg-primary data-[highlighted]:!text-white transition-colors group"
						onClick={(e) => {
							e.stopPropagation();
							onDelete();
						}}
					>
						<Trash2 className="size-4 text-gray-700 group-data-[highlighted]:text-white" />
						Delete
					</DropdownMenuItem>
				)}
				{onDuplicate && (
					<DropdownMenuItem
						className="p-3 font-normal text-base text-gray-700 flex items-center gap-2 cursor-pointer data-[highlighted]:bg-primary data-[highlighted]:!text-white transition-colors group"
						onClick={(e) => {
							e.stopPropagation();
							onDuplicate();
						}}
					>
						<Copy className="size-4 text-gray-700 group-data-[highlighted]:text-white" />
						Duplicate
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
