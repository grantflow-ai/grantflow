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
  projectTeamMembers?: {
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
  // const router = useRouter();

  // const hasApplications = project.applications_count > 0;
  // const pluralSuffix = project.applications_count > 1 ? "s" : "";
  // const applicationText = hasApplications
  //   ? `${project.applications_count} Application${pluralSuffix}`
  //   : "You Have No Applications Yet";
  // const projectDescription =
  //   project.description ??
  //   "Description of research project goes here.Description of research project goes here.";

  // const handleCardClick = () => {
  //   router.push(PagePath.PROJECT_DETAIL.replace(":projectId", project.id));
  // };

  return (
    // <div
    // 	className="relative h-[300px] w-[413px] shrink-0 rounded-lg bg-surface-primary border border-border-primary"
    // 	data-testid="dashboard-project-card"
    // >
    // 	<button
    // 		aria-label={`View project: ${project.name}`}
    // 		className="absolute inset-0 z-0"
    // 		onClick={handleCardClick}
    // 		type="button"
    // 	>
    // 		<span className="sr-only">View project details</span>
    // 	</button>
    // 	<div className="relative size-full overflow-clip pointer-events-none">
    // 		<div className="relative flex h-[300px] w-[413px] flex-col items-start justify-between p-6">
    // 			<div className="relative flex shrink-0 flex-col items-start justify-start gap-4">
    // 				<div className="relative shrink-0 rounded-full bg-primary px-3 py-1">
    // 					<div className="relative flex size-full flex-row items-center">
    // 						<div className="relative flex flex-row items-center justify-start gap-1.5">
    // 							<List className="relative shrink-0 size-3 text-white" />
    // 							<div className="relative shrink-0 text-left text-[12px] leading-[18px] text-white font-body">
    // 								{applicationText}
    // 							</div>
    // 						</div>
    // 					</div>
    // 				</div>
    // 				<div className="relative flex w-[365px] shrink-0 flex-col items-start justify-center gap-3">
    // 					<div className="relative flex w-full shrink-0 flex-col justify-center text-[20px] font-medium text-text-primary font-heading leading-[26px]">
    // 						{project.name}
    // 					</div>
    // 					<div className="relative flex w-full shrink-0 flex-col justify-center text-[14px] text-text-secondary font-body leading-[21px]">
    // 						{projectDescription}
    // 					</div>
    // 				</div>
    // 			</div>
    // 			<div className="relative flex w-full shrink-0 flex-row items-center justify-between">
    // 				<div className="relative min-h-px min-w-px grow shrink-0 basis-0 flex flex-row items-center justify-start gap-1">
    // 					<AvatarGroup size="md" users={projectTeamMembers} />
    // 				</div>
    // 			</div>
    // 			<button
    // 				aria-label="More options"
    // 				className="absolute right-4 top-4 size-6 flex items-center justify-center z-10 pointer-events-auto"
    // 				data-testid="more-options-button"
    // 				onClick={() => {
    // 					setShowDropdown(!showDropdown);
    // 				}}
    // 				type="button"
    // 			>
    // 				<MoreVertical className="size-4 text-black" />
    // 			</button>
    // 		</div>
    // 	</div>

    // 	{showDropdown && (
    // 		<div
    // 			className="absolute right-4 top-12 z-10 flex w-[150px] flex-col items-start justify-start rounded-lg bg-surface-primary border border-border-primary shadow-lg pointer-events-auto"
    // 			data-testid="dropdown-menu"
    // 		>
    // 			<button
    // 				className="relative flex h-[40px] w-full shrink-0 flex-row items-center justify-start hover:bg-surface-secondary first:rounded-t-lg"
    // 				data-testid="delete-project-button"
    // 				onClick={() => {
    // 					onDelete?.(project.id);
    // 					setShowDropdown(false);
    // 				}}
    // 				type="button"
    // 			>
    // 				<div className="relative flex size-full flex-row items-center justify-start gap-2 px-3">
    // 					<Trash2 className="relative shrink-0 size-4 text-app-gray-300" />
    // 					<div className="relative text-left text-[14px] leading-[21px] text-app-gray-300 font-body">
    // 						Delete
    // 					</div>
    // 				</div>
    // 			</button>
    // 			<button
    // 				className="relative flex h-[40px] w-full shrink-0 flex-row items-center justify-start hover:bg-surface-secondary last:rounded-b-lg"
    // 				data-testid="duplicate-project-button"
    // 				onClick={() => {
    // 					onDuplicate?.(project.id);
    // 					setShowDropdown(false);
    // 				}}
    // 				type="button"
    // 			>
    // 				<div className="relative flex size-full flex-row items-center justify-start gap-2 px-3">
    // 					<Copy className="relative shrink-0 size-4 text-black" />
    // 					<div className="relative text-left text-[14px] leading-[21px] text-text-primary font-body">
    // 						Duplicate
    // 					</div>
    // 				</div>
    // 			</button>
    // 		</div>
    // 	)}
    // </div>
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
            <h4 className="font-medium text-2xl text-black">{project.name}</h4>
            <p className="text-gray-600 text-base font-normal">
              {project.description}
            </p>
          </div>
        </div>
        <div className="flex items-end  h-full">
          <div className="flex items-center ">
            <AvatarGroup size="md" users={projectTeamMembers ?? []} />
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
              onClick={() => onDelete?.(project.id)}
              className="p-3 font-normal text-base text-gray-700 flex items-center gap-2 cursor-pointer data-[highlighted]:bg-transparent data-[highlighted]:text-gray-700"
            >
              <Trash2 className="size-4 text-gray-700" />
              Delete
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDuplicate?.(project.id)}
              className="p-3 font-normal text-base text-gray-700 flex items-center gap-2 cursor-pointer data-[highlighted]:bg-transparent data-[highlighted]:text-gray-700"
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
