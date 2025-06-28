"use client";

import { useState } from "react";
import { DevAutofillButton } from "./dev-autofill-button";
import { DevResetButton } from "./dev-reset-button";

export function DevPanel() {
	const [isExpanded, setIsExpanded] = useState(false);

	if (process.env.NODE_ENV === "production") {
		return null;
	}

	return (
		<div
			className={`fixed right-0 top-1/2 z-50 -translate-y-1/2 transition-all duration-300 ${
				isExpanded ? "translate-x-0" : "translate-x-[calc(100%-2rem)]"
			}`}
		>
			<div
				className={`group flex flex-col gap-2 rounded-l-lg bg-slate-900/90 p-4 shadow-lg backdrop-blur-sm transition-opacity duration-300 ${
					isExpanded ? "opacity-100" : "opacity-40 hover:opacity-60"
				}`}
			>
				<button
					aria-label={isExpanded ? "Collapse dev tools" : "Expand dev tools"}
					className="absolute -left-8 top-1/2 flex h-16 w-8 -translate-y-1/2 items-center justify-center rounded-l-lg bg-slate-900/40 hover:bg-slate-900/60"
					onClick={() => {
						setIsExpanded(!isExpanded);
					}}
					type="button"
				>
					<svg
						className={`h-4 w-4 text-white transition-transform ${isExpanded ? "rotate-180" : ""}`}
						fill="none"
						stroke="currentColor"
						strokeWidth={2}
						viewBox="0 0 24 24"
					>
						<path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</button>
				<div className="mb-2 text-xs font-semibold text-white">Dev Tools</div>
				<DevAutofillButton />
				<DevResetButton />
			</div>
		</div>
	);
}
