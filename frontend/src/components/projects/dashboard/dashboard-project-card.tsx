import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { API } from "@/types/api-types";
import { Copy, MoreVertical, Trash2 } from "lucide-react";
import Image from "next/image";

interface DashboardProjectCardProps {
  project: API.ListProjects.Http200.ResponseBody[0];
  onDelete: (projectId: string) => void;
  onDuplicate: (projectId: string) => void;
}

export function DashboardProjectCard({ project, onDelete, onDuplicate }: DashboardProjectCardProps) {
  return (
    <div className="w-[413px] h-[300px] rounded-sm p-6 border border-gray-200 bg-preview-bg flex">
        <div className="flex  flex-col w-full">
            <div className="flex flex-col gap-3">
                <figure className="px-2 gap-1 bg-gray-100 text-app-dark-blue w-fit items-center flex rounded-[20px]">
                    <div className="size-3">
                        <Image
                            src="/icons/note_stack.svg"
                            alt="No projects"
                            width={100}
                            height={100}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    You have no applications yet
                </figure>
                <div className="flex flex-col gap-2">
                    <h4 className="font-medium text-2xl text-black">
                        {project.name}
                    </h4>
                    <p className="text-gray-600 text-base font-normal">
                        {project.description ?? "Create grants applications under this research."}
                    </p>
                </div>
            </div>
            <div className="flex items-end  h-full">
                <div className="size-8 bg-[#369E94] rounded-sm flex items-center justify-center ">
                    <p className="font-semibold text-base text-white">
                        NH
                    </p>
                </div>
            </div>
        </div>
        <div>
            <DropdownMenu>
                <DropdownMenuTrigger className="-mt-2 cursor-pointer">
                    <MoreVertical className="size-4 text-gray-700 " />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[200px] rounded-sm bg-white border border-gray-200 shadow-none p-0">
                    <DropdownMenuItem
                        className="p-3 font-normal text-base text-gray-700 flex items-center gap-2 cursor-pointer"
                        onClick={() => onDelete(project.id)}
                    >
                        <Trash2 className="size-4 text-gray-700" />
                        Delete
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="p-3 font-normal text-base text-gray-700 flex items-center gap-2 cursor-pointer"
                        onClick={() => onDuplicate(project.id)}
                    >
                        <Copy className="size-4 text-gray-700" />
                        Duplicate
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </div>
  );
}