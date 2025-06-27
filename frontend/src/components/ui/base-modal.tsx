"use client";

import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BaseModalProps {
	children: ReactNode;
	isOpen: boolean;
	onClose: () => void;
	title?: string;
}

export function BaseModal({ children, isOpen, onClose, title }: BaseModalProps) {
	return (
		<Dialog onOpenChange={onClose} open={isOpen}>
			<DialogContent aria-describedby={title ? `${title} Dialog` : "Dialog"}>
				{title && (
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
				)}
				{children}
			</DialogContent>
		</Dialog>
	);
}
