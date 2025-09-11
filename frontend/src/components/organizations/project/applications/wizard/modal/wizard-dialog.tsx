import { forwardRef, type ReactNode, useImperativeHandle, useState } from "react";
import {
	AppDialog,
	AppDialogContent,
	AppDialogDescription,
	AppDialogFooter,
	AppDialogHeader,
	AppDialogTitle,
} from "@/components/app/app-dialog";

export interface WizardDialogRef {
	close: () => void;
	open: (content: DialogContent) => void;
}

interface DialogContent {
	content: ReactNode;
	description?: string;
	dismissOnOutsideClick?: boolean;
	footer?: ReactNode;
	minWidth?: string;
	title: string;
}

export const WizardDialog = forwardRef<WizardDialogRef>((_, ref) => {
	const [dialog, setDialog] = useState<{ isOpen: boolean } & DialogContent>({
		content: null,
		description: undefined,
		dismissOnOutsideClick: true,
		footer: undefined,
		isOpen: false,
		minWidth: "min-w-3xl",
		title: "",
	});

	useImperativeHandle(ref, () => ({
		close: () => {
			setDialog((prev) => ({ ...prev, isOpen: false }));
		},
		open: (content: DialogContent) => {
			setDialog({
				...content,
				isOpen: true,
			});
		},
	}));

	const handleOpenChange = (open: boolean) => {
		if (!open && dialog.dismissOnOutsideClick) {
			setDialog((prev) => ({ ...prev, isOpen: false }));
		}
	};

	return (
		<AppDialog onOpenChange={handleOpenChange} open={dialog.isOpen}>
			<AppDialogContent
				className={`w-fit ${dialog.minWidth} rounded outline-1 outline-primary p-8 border-0 max-h-[90vh] overflow-hidden flex flex-col`}
			>
				<AppDialogHeader>
					<AppDialogTitle className="text-app-black text-2xl font-medium font-heading leading-loose">
						{dialog.title}
					</AppDialogTitle>
					{dialog.description && (
						<AppDialogDescription className="text-app-gray-600 text-base font-normal leading-tight">
							{dialog.description}
						</AppDialogDescription>
					)}
				</AppDialogHeader>
				<div className="flex-1 overflow-y-auto">{dialog.content}</div>
				{dialog.footer && <AppDialogFooter>{dialog.footer}</AppDialogFooter>}
			</AppDialogContent>
		</AppDialog>
	);
});

WizardDialog.displayName = "WizardDialog";
