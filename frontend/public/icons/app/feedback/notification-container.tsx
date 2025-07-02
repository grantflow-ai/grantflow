"use client";

import { AnimatePresence, motion } from "motion/react";

import { NotificationBanner } from "@/components/app/feedback/notification-banner";
import { useNotificationStore } from "@/stores/notification-store";

export function NotificationContainer() {
	const { notifications, removeNotification } = useNotificationStore();

	if (notifications.length === 0) {
		return null;
	}

	return (
		<div className="fixed top-20 right-6 z-50 flex flex-col gap-3 pointer-events-none">
			<AnimatePresence mode="popLayout">
				{notifications.map((notification) => (
					<motion.div
						animate={{ opacity: 1, scale: 1, x: 0 }}
						className="pointer-events-auto"
						exit={{ opacity: 0, scale: 0.9, x: 300 }}
						initial={{ opacity: 0, scale: 0.9, x: 300 }}
						key={notification.id}
						layout
						transition={{
							duration: 0.3,
							ease: "easeOut",
							layout: { duration: 0.2 },
						}}
					>
						<NotificationBanner notification={notification} onClose={removeNotification} />
					</motion.div>
				))}
			</AnimatePresence>
		</div>
	);
}
