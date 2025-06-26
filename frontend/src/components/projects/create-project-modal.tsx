"use client";

import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PagePath } from "@/enums";

import { CreateProjectForm } from "./create-project-form";

export function CreateProjectModal() {
	const router = useRouter();

	const [isOpen, setIsOpen] = useState(false);

	return (
		<Dialog onOpenChange={setIsOpen} open={isOpen}>
			<DialogTrigger asChild={true}>
				<Button className="flex items-center gap-1" data-testid="create-project-button" size="sm">
					<PlusCircle className="size-3.5" />
					<span>New Project</span>
				</Button>
			</DialogTrigger>
			<DialogContent aria-describedby="New project Dialog">
				<DialogHeader>
					<DialogTitle>New Project</DialogTitle>
				</DialogHeader>
				<CreateProjectForm
					closeModal={(projectId) => {
						setIsOpen(false);
						if (projectId) {
							router.replace(PagePath.PROJECT_DETAIL.replace(":projectId", projectId));
						}
					}}
				/>
			</DialogContent>
		</Dialog>
	);
}