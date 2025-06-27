"use client";

import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BaseModal } from "@/components/ui/base-modal";
import { Button } from "@/components/ui/button";
import { PagePath } from "@/enums";

import { CreateProjectForm } from "../forms/create-project-form";

export function CreateProjectModal() {
	const router = useRouter();

	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<Button
				className="flex items-center gap-1"
				data-testid="create-project-button"
				onClick={() => {
					setIsOpen(true);
				}}
				size="sm"
			>
				<PlusCircle className="size-3.5" />
				<span>New Project</span>
			</Button>

			<BaseModal
				isOpen={isOpen}
				onClose={() => {
					setIsOpen(false);
				}}
				title="New Project"
			>
				<CreateProjectForm
					closeModal={(projectId) => {
						setIsOpen(false);
						if (projectId) {
							router.replace(PagePath.PROJECT_DETAIL.replace(":projectId", projectId));
						}
					}}
				/>
			</BaseModal>
		</>
	);
}
