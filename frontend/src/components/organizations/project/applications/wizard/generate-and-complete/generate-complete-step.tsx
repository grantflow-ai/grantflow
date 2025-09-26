"use client";

import ProgressCircle from "@/components/applications/wizard/circular-progress";

export function GenerateCompleteStep({ progress }: { progress: number }) {
	return (
		<div
			className="flex size-full flex-col items-center justify-center bg-[#FAF9FB] p-6"
			data-testid="generate-complete-step"
		>
			<div className="flex flex-col items-center justify-center gap-12 text-center">
				<ProgressCircle progress={progress} />
				<div className="flex flex-col items-center gap-2">
					<h3 className="font-medium font-cabin text-[28px] text-app-black">
						{progress < 100
							? "Great job! Your Application Draft Is Being Generated"
							: "Your Application Draft Is Ready"}
					</h3>
					<p className="max-w-xl font-sans font-base font-normal text-app-gray-700">
						{progress < 100
							? "We’re preparing your draft. You’ll be able to download it here, and we’ll also send a copy to your inbox shortly."
							: "You can download it directly here. We’ve also sent a copy to your inbox for your convenience."}
					</p>
				</div>
			</div>
		</div>
	);
}
