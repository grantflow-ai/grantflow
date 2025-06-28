"use client";

import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BaseModalProps {
	children: ReactNode;
	isOpen: boolean;
	onClose: () => void;
	title?: string;
}

export function BaseModal({ children, isOpen, onClose, title }: BaseModalProps) {
	return (
		<Dialog onOpenChange={onClose} open={isOpen}>
			<DialogContent>
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
