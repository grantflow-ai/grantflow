"use client";

import { Loader2 } from "lucide-react";

export function Loader() {
	return (
		<div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
			<Loader2 className="w-1/5 h-1/5 animate-spin text-primary" />
		</div>
	);
}
