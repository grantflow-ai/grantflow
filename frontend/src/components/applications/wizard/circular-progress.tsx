"use client";

// import { useEffect,useState  } from "react";

interface ProgressCircleProps {
	progress: number;
}

export default function ProgressCircle({ progress }: ProgressCircleProps) {
	return (
		<div
			aria-live="polite"
			aria-valuemax={100}
			aria-valuemin={0}
			aria-valuenow={progress}
			className="progress-circle"
			role="progressbar"
			style={
				{
					"--progress": `${progress}%`,
				} as React.CSSProperties
			}
		/>
	);
}
