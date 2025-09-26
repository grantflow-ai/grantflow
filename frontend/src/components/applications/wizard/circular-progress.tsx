"use client";

import styles from "./circular-progress.module.css";

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
			className={styles["progress-circle"]}
			role="progressbar"
			style={
				{
					"--progress": `${progress}%`,
				} as React.CSSProperties
			}
		/>
	);
}
