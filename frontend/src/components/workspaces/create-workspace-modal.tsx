"use client";

import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PagePath } from "@/enums";

import { CreateWorkspaceForm } from "./create-workspace-form";

export function CreateWorkspaceModal() {
	const router = useRouter();

	const [isOpen, setIsOpen] = useState(false);

	return (
		<Dialog onOpenChange={setIsOpen} open={isOpen}>
			<DialogTrigger asChild={true}>
				<Button className="flex items-center gap-1" data-testid="create-workspace-button" size="sm">
					<PlusCircle className="size-3.5" />
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
