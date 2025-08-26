"use client";

import Image from "next/image";

export function GenerateCompleteStep() {
	return (
		<div
			className="flex size-full flex-col p-6 bg-preview-bg items-center justify-center"
			data-testid="generate-complete-step"
		>
			<div className="flex flex-col items-center justify-center text-center space-y-8">
				<div className="flex items-center justify-center w-full">
					<Image
						alt="GrantFlow logo"
						className="opacity-40"
						height={100}
						src="/icons/preview-logo.svg"
						style={{ height: "auto", maxHeight: 120 }}
						width={100}
					/>
				</div>
				<div className="space-y-2">
					<h3 className="text-3xl font-medium font-heading text-gray-900">
						Great job! Your Application Draft Is Being Generated
					</h3>
					<p className="text-gray-700 w-full leading-tight">
						We&apos;re now generating your draft and will send it to your inbox shortly.
					</p>
				</div>
			</div>
		</div>
	);
}
