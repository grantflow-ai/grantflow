"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface NotificationData {
	id: string;
	message: string;
	projectName: string;
	title: string;
	type?: "deadline" | "error" | "info" | "success" | "warning";
}

interface NotificationBannerProps {
	className?: string;
	notification: NotificationData;
	onClose?: (id: string) => void;
}

export function NotificationBanner({ className, notification, onClose }: NotificationBannerProps) {
	const { id, message, projectName, title, type = "deadline" } = notification;

	return (
		<div
			className={cn(
				"relative flex w-[320px] flex-col gap-2 rounded-lg bg-white p-4 shadow-lg border border-app-gray-200",
				className,
			)}
		>
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-2">
					<div
						className={cn(
							"size-2 rounded-full shrink-0",
							type === "deadline" && "bg-primary",
							type === "info" && "bg-app-slate-blue",
							type === "warning" && "bg-[#ff9747]",
							type === "success" && "bg-app-green",
						)}
					/>
					<h3
						className="font-body font-semibold text-[14px] leading-[18px] text-app-black"
						data-testid="notification-title"
					>
						{title}
					</h3>
				</div>
				{onClose && (
					<button
						aria-label="Close notification"
						className="flex size-4 items-center justify-center text-app-gray-600 hover:text-app-black transition-colors"
						data-testid="notification-close-button"
						onClick={() => {
							onClose(id);
						}}
						type="button"
					>
						<X className="size-3" />
					</button>
				)}
			</div>

			<div className="flex flex-col gap-1">
				<p
					className="font-body text-[12px] leading-[16px] text-app-gray-600"
					data-testid="notification-message"
				>
					Your project{" "}
					<span className="font-semibold text-app-black" data-testid="notification-project-name">
						&ldquo;{projectName}&rdquo;
					</span>{" "}
					{message}
				</p>
			</div>
		</div>
	);
}
