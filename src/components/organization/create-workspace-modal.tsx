"use client";

import type { Localisation } from "@/i18n";
import { Button } from "gen/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "gen/ui/dialog";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { CreateWorkspaceForm } from "./create-workspace-form";

export function CreateWorkspaceModal({
	organizationId,
	locales,
}: {
	organizationId: string;
	locales: Localisation;
}) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild={true}>
				<Button
					variant="outline"
					className="h-full flex flex-col items-center justify-center p-6"
					data-testid="create-workspace-button"
				>
					<PlusCircle className="h-12 w-12 mb-2" />
					<span>{locales.organizationView.createWorkspace}</span>
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{locales.organizationView.createWorkspaceModalTitle}</DialogTitle>
				</DialogHeader>
				<CreateWorkspaceForm
					organizationId={organizationId}
					locales={locales}
					closeModal={() => {
						setIsOpen(false);
					}}
				/>
			</DialogContent>
		</Dialog>
	);
}
