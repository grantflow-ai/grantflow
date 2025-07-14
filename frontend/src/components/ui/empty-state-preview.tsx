"use client";

import Image from "next/image";

export function EmptyStatePreview() {
	return (
		<div className="flex flex-1 items-center justify-center">
			<Image
				alt="Preview logo"
				height={180}
				src="/icons/preview-logo.svg"
				style={{ height: "auto", maxHeight: 180 }}
				width={180}
			/>
		</div>
	);
}
