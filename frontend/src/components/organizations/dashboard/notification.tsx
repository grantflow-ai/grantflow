"use client";

import { BellIcon, X } from "lucide-react";
import { useState } from "react";

const notifications = [
	{
		description:
			'Your project "Neuroadaptive Interfaces – EIC Pathfinder" is due in 7 days. Make sure everything is ready for submission.',
		dotColor: "bg-primary",
		id: 1,
		title: "7 days until grant deadline",
	},
	{
		description:
			'Your project "Neuroadaptive Interfaces – EIC Pathfinder" is due in 7 days. Make sure everything is ready for submission.',
		dotColor: "bg-primary",
		id: 2,
		title: "7 days until grant deadline",
	},
	{
		description:
			'Your project "Neuroadaptive Interfaces – EIC Pathfinder" is due in 7 days. Make sure everything is ready for submission.',
		dotColor: "bg-app-gray-200",
		id: 3,
		title: "7 days until grant deadline",
	},
];

export function Notification() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="relative">
			<button
				className="cursor-pointer relative block"
				data-testid="notification-trigger"
				onClick={() => {
					setIsOpen(!isOpen);
				}}
				type="button"
			>
				<BellIcon className="size-4 text-app-gray-600" />
				<div className="bg-error size-1 rounded-full absolute -top-0.5 -right-0.5" />
			</button>

			{isOpen && (
				<div
					className="absolute right-0 top-10 bg-white w-[428px] rounded border border-app-gray-100 z-50 shadow-sm"
					data-testid="notification-panel"
				>
					{notifications.map((item, index) => (
						<div
							className={`
								h-28 p-4 flex flex-col gap-1 items-end justify-start border-b border-app-gray-100 last:border-b-0 cursor-pointer
								${index === 1 ? "bg-preview-bg hover:bg-preview-bg" : "hover:bg-preview-bg"}
							`}
							data-testid={`notification-item-${item.id}`}
							key={item.id}
						>
							<div className="flex items-start justify-between w-full">
								<div className="flex items-center justify-center">
									<div
										className={`size-3 rounded-full ${item.dotColor}`}
										data-testid={`notification-dot-${item.id}`}
									/>
								</div>
								<button
									className="text-app-gray-700 hover:text-app-black"
									data-testid={`notification-close-${item.id}`}
									onClick={(e) => {
										e.stopPropagation();
									}}
									type="button"
								>
									<X className="size-4" />
								</button>
							</div>
							<div className="flex flex-col gap-1 w-full">
								<p
									className="font-semibold text-[16px] leading-[20px] text-app-black text-left"
									data-testid={`notification-title-${item.id}`}
								>
									{item.title}
								</p>
								<p
									className="text-[14px] leading-[18px] text-app-gray-600 font-normal text-left"
									data-testid={`notification-description-${item.id}`}
								>
									{item.description}
								</p>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
