"use client";

import { Button } from "gen/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "gen/ui/dialog";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { CreateWorkspaceForm } from "./create-workspace-form";
import { useRouter } from "next/navigation";
import { PagePath } from "@/enums";

export function CreateWorkspaceModal() {
	const router = useRouter();

	const [isOpen, setIsOpen] = useState(false);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild={true}>
				<Button size="sm" className="flex items-center gap-1" data-testid="create-workspace-button">
					<PlusCircle className="h-3.5 w-3.5" />
					<span>New Workspace</span>
				</Button>
			</DialogTrigger>
			<DialogContent aria-describedby="New workspace Dialog">
				<DialogHeader>
					<DialogTitle>New Workspace</DialogTitle>
				</DialogHeader>
				<CreateWorkspaceForm
					closeModal={(workspaceId) => {
						setIsOpen(false);
						if (workspaceId) {
							router.replace(PagePath.WORKSPACE_DETAIL.replace(":workspaceId", workspaceId));
						}
					}}
				/>
			</DialogContent>
		</Dialog>
	);
}
