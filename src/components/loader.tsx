"use client";

import { Loader2 } from "lucide-react";

export function Loader() {
	return (
		<div className="flex items-center justify-center bg-background/80 backdrop-blur-sm">
			<Loader2 className="h-20 w-20 animate-spin text-primary" />
		</div>
	);
}
