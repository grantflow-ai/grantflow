import {
	AppDialog,
	AppDialogContent,
	AppDialogDescription,
	AppDialogFooter,
	AppDialogHeader,
	AppDialogTitle,
} from "@/components/app/app-dialog";
import { useWizardStore } from "@/stores/wizard-store";

export function WizardDialog() {
	const dialog = useWizardStore((state) => state.dialog);

	return (
		<AppDialog
			onOpenChange={(open) => {
				if (!open) {
					return;
				}
			}}
			open={dialog.isOpen}
		>
			<AppDialogContent className="w-fit min-w-3xl rounded outline-1 outline-primary p-8 border-0 max-h-[90vh] overflow-hidden flex flex-col">
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
}
