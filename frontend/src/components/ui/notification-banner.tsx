"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface NotificationData {
	id: string;
	message: string;
	projectName: string;
	title: string;
	type?: "deadline" | "info" | "success" | "warning";
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
				"relative flex w-[320px] flex-col gap-2 rounded-lg bg-white p-4 shadow-lg border border-[#e1dfeb]",
				className,
			)}
		>
			{/* Header with indicator and close button */}
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-2">
					{/* Blue dot indicator */}
					<div
						className={cn(
							"size-2 rounded-full shrink-0",
							type === "deadline" && "bg-[#1e13f8]",
							type === "info" && "bg-[#369e94]",
							type === "warning" && "bg-[#ff9747]",
							type === "success" && "bg-[#47ff97]",
						)}
					/>
					<h3 className="font-['Source_Sans_Pro'] font-semibold text-[14px] leading-[18px] text-[#2e2d36]">
						{title}
					</h3>
				</div>
				{onClose && (
					<button
						aria-label="Close notification"
						className="flex size-4 items-center justify-center text-[#636170] hover:text-[#2e2d36] transition-colors"
						onClick={() => {
							onClose(id);
						}}
						type="button"
					>
						<X className="size-3" />
					</button>
				)}
			</div>

			{/* Content */}
			<div className="flex flex-col gap-1">
				<p className="font-['Source_Sans_Pro'] text-[12px] leading-[16px] text-[#636170]">
					Your project <span className="font-semibold text-[#2e2d36]">&ldquo;{projectName}&rdquo;</span>{" "}
					{message}
				</p>
			</div>
		</div>
	);
}
