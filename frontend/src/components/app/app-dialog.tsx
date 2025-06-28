import type * as React from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AppDialogContentProps extends Omit<React.ComponentProps<typeof DialogContent>, "showCloseButton"> {
	showCloseButton?: boolean;
}

interface AppDialogProps extends React.ComponentProps<typeof Dialog> {
	showCloseButton?: boolean;
}

interface ConfirmDialogProps {
	cancelText?: string;
	confirmText?: string;
	description?: string;
	onCancel?: () => void;
	onConfirm: () => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	showCloseButton?: boolean;
	title: string;
	variant?: "danger" | "default";
}

export function AppDialog({ children, ...props }: AppDialogProps) {
	return <Dialog {...props}>{children}</Dialog>;
}

export function AppDialogContent({ children, className, showCloseButton = true, ...props }: AppDialogContentProps) {
	return (
		<DialogContent
			className={className}
			data-testid="app-dialog-content"
			showCloseButton={showCloseButton}
			{...props}
		>
			{children}
		</DialogContent>
	);
}

export function AppDialogDescription({ className, ...props }: React.ComponentProps<typeof DialogDescription>) {
	return <DialogDescription className={className} {...props} />;
}

export function AppDialogFooter({ className, ...props }: React.ComponentProps<typeof DialogFooter>) {
	return <DialogFooter className={className} {...props} />;
}

export function AppDialogHeader({ className, ...props }: React.ComponentProps<typeof DialogHeader>) {
	return <DialogHeader className={className} {...props} />;
}

export function AppDialogTitle({ className, ...props }: React.ComponentProps<typeof DialogTitle>) {
	return <DialogTitle className={className} {...props} />;
}



export function AppDialogTrigger({ ...props }: React.ComponentProps<typeof DialogTrigger>) {
	return <DialogTrigger {...props} />;
}

export function ConfirmDialog({
	cancelText = "Cancel",
	confirmText = "Confirm",
	description,
	onCancel,
	onConfirm,
	onOpenChange,
	open,
	showCloseButton = true,
	title,
	variant = "default",
}: ConfirmDialogProps) {
	const handleCancel = () => {
		onCancel?.();
		onOpenChange(false);
	};

	const handleConfirm = () => {
		onConfirm();
		onOpenChange(false);
	};

	return (
		<AppDialog onOpenChange={onOpenChange} open={open}>
			<AppDialogContent data-testid="confirm-dialog" showCloseButton={showCloseButton}>
				<AppDialogHeader>
					<AppDialogTitle>{title}</AppDialogTitle>
					{description && <AppDialogDescription>{description}</AppDialogDescription>}
				</AppDialogHeader>
				<AppDialogFooter>
					<button
						className={cn(
							"inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
							"border border-input bg-background hover:bg-accent hover:text-accent-foreground",
						)}
						data-testid="confirm-dialog-cancel"
						onClick={handleCancel}
						type="button"
					>
						{cancelText}
					</button>
					<button
						className={cn(
							"inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
							variant === "danger"
								? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
								: "bg-primary text-primary-foreground hover:bg-primary/90",
						)}
						data-testid="confirm-dialog-confirm"
						onClick={handleConfirm}
						type="button"
					>
						{confirmText}
					</button>
				</AppDialogFooter>
			</AppDialogContent>
		</AppDialog>
	);
}
