import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BaseModalProps {
	children: ReactNode;
	className?: string;
	isOpen: boolean;
	onClose: () => void;
	title?: string;
}

export function BaseModal({ children, className, isOpen, onClose, title }: BaseModalProps) {
	return (
		<Dialog
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			open={isOpen}
		>
			<DialogContent className={`bg-white border border-primary ${className}`}>
				<DialogHeader>
					{title ? <DialogTitle>{title}</DialogTitle> : <DialogTitle className="sr-only">Modal</DialogTitle>}
					<DialogDescription className="sr-only">
						{title ? `${title} modal dialog` : "Modal dialog"}
					</DialogDescription>
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	);
}
