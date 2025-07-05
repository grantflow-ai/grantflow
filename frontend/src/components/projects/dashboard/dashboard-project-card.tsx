"use client";

import { Copy, MoreVertical, Trash2 } from "lucide-react";

import { AvatarGroup } from "@/components/app";

import type { API } from "@/types/api-types";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardProjectCardProps {
  onDelete?: (projectId: string) => void;
  onDuplicate?: (projectId: string) => void;
  project: API.ListProjects.Http200.ResponseBody[0];
  projectTeamMembers: {
    backgroundColor: string;
    initials: string;
  }[];
}

export function DashboardProjectCard({
  onDelete,
  onDuplicate,
  project,
  projectTeamMembers,
}: DashboardProjectCardProps) {
  return (
    <div
      data-testid="dashboard-project-card"
      className="w-[413px] h-[300px] rounded-sm p-6 border border-gray-200 bg-preview-bg flex"
    >
      <div className="flex  flex-col w-full">
        <div className="flex flex-col gap-3">
          <figure
            data-testid="project-card-figure"
            className="px-2 gap-1 bg-gray-100 text-app-dark-blue w-fit items-center flex rounded-[20px]"
          >
            <div className="size-3">
              <Image
                src="/icons/note_stack.svg"
                alt="No projects"
                width={100}
                height={100}
                className="w-full h-full object-cover"
                data-testid="project-card-icon"
              />
            </div>
            You have no applications yet
          </figure>
          <div className="flex flex-col gap-2">
            <h4
              className="font-medium text-2xl text-black"
              data-testid="project-card-title"
            >
              {project.name}
            </h4>
            <p
              className="text-gray-600 text-base font-normal"
              data-testid="project-card-description"
            >
              {project.description}
            </p>
          </div>
        </div>
        <div className="flex items-end  h-full">
          <div
            className="flex items-center "
            data-testid="project-card-avatar-group"
          >
            <AvatarGroup size="md" users={projectTeamMembers} />
          </div>
        </div>
      </div>
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="-mt-2 cursor-pointer"
            data-testid="project-card-menu-trigger"
          >
            <MoreVertical className="size-4 text-gray-700 " />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            data-testid="project-card-menu"
            className="w-[200px] rounded-sm bg-white border border-gray-200 shadow-none p-0"
          >
            <DropdownMenuItem
              onClick={() => onDelete?.(project.id)}
              className="p-3 font-normal text-base text-gray-700 flex items-center gap-2 cursor-pointer data-[highlighted]:bg-transparent data-[highlighted]:text-gray-700"
              data-testid="project-card-delete"
            >
              <Trash2 className="size-4 text-gray-700" />
              Delete
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDuplicate?.(project.id)}
              className="p-3 font-normal text-base text-gray-700 flex items-center gap-2 cursor-pointer data-[highlighted]:bg-transparent data-[highlighted]:text-gray-700"
              data-testid="project-card-duplicate"
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
