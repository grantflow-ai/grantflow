import { AppButton } from "@/components/app";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus } from "lucide-react";

interface DashboardHeaderProps {
  onCreateProject: () => void;
  onInviteCollaborators: () => void;
}

export function DashboardHeader({ onCreateProject, onInviteCollaborators }: DashboardHeaderProps) {
  return (
    <div className="flex w-full items-center justify-between">
        <div className="flex flex-col gap-2">
            <h2 className="font-medium text-4xl ">Dashboard</h2>
            <p className="font-normal text-base text-gray-600">
                Your one‑stop overview for all your Research Projects.
            </p>
        </div>
        <div className="flex items-center gap-6">
            <Tooltip>
                <TooltipTrigger onClick={onInviteCollaborators}>
                    <div className="size-8 flex items-center justify-center bg-gray-50 rounded-xs cursor-pointer">
                        <Plus className="size-4 text-primary" />
                    </div>
                </TooltipTrigger>
                <TooltipContent className="bg-app-dark-blue px-3 py-1 rounded-xs">
                    <p className="text-white font-normal text-base">
                        Invite collaborators
                    </p>
                </TooltipContent>
            </Tooltip>
            <AppButton variant="primary" className="px-4 py-2" onClick={onCreateProject}>
                + New Research Project
            </AppButton>
        </div>
    </div>
  );
}