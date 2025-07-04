"use client";

import { toast } from "sonner";

interface ToastTestButtonProps {
	enabled: boolean;
}

export function ToastTestButton({ enabled }: ToastTestButtonProps) {
	if (!enabled) return null;

	const handleClick = () => {
		const toastTypes = ["success", "error", "info", "warning"] as const;
		const randomType = toastTypes[Math.floor(Math.random() * toastTypes.length)];
		const messages = {
			error: "Error! Something went wrong.",
			info: "Info! This is an informational message.",
			success: "Success! Operation completed successfully.",
			warning: "Warning! Please check this action.",
		};
		toast[randomType](messages[randomType]);
	};

	return (
		<button
			className="fixed bottom-4 right-20 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg transition-all hover:bg-orange-700"
			onClick={handleClick}
			title="Test Toast Notification"
			type="button"
		>
			<span className="text-xl">🍞</span>
		</button>
	);
}
