"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
	children: React.ReactNode;
	isOpen: boolean;
	onClose: () => void;
}

export function Modal({ children, isOpen, onClose }: ModalProps) {
	const overlayRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "";
		};
	}, [isOpen, onClose]);

	const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	if (!isOpen) return null;

	return createPortal(
		// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
		<div
			aria-modal="true"
			className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(63,59,103,0.4)]"
			onClick={handleOverlayClick}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					onClose();
				}
			}}
			ref={overlayRef}
			role="dialog"
			tabIndex={-1}
		>
			{children}
		</div>,
		document.body,
	);
}
