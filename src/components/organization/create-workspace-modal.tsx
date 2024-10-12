"use client";

import type { Localisation } from "@/i18n";
import { Button } from "gen/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "gen/ui/dialog";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { CreateWorkspaceForm } from "./create-workspace-form";

export function CreateWorkspaceModal({ locales }: { locales: Localisation }) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild={true}>
				<Button size="sm" className="flex items-center gap-1" data-testid="create-workspace-button">
					<PlusCircle className="h-3.5 w-3.5" />
					<span>{locales.workspaceListView.newWorkspace}</span>
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{locales.workspaceListView.newWorkspace}</DialogTitle>
				</DialogHeader>
				<CreateWorkspaceForm
					locales={locales}
					closeModal={() => {
						setIsOpen(false);
					}}
				/>
			</DialogContent>
		</Dialog>
	);
}
