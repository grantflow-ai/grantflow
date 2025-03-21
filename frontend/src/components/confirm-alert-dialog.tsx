import React from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmAlertDialogProps {
	description: string;
	onConfirm: () => void;
	title: string;
	triggerText: string;
}

export function ConfirmAlertDialog({ description, onConfirm, title, triggerText }: ConfirmAlertDialogProps) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button data-testid="confirm-alert-trigger" variant="outline">
					{triggerText}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction data-testid="confirm-alert-action" onClick={onConfirm}>
						Continue
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
