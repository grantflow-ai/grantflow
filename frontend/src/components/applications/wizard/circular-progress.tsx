"use client";

interface CircularProgressProps {
	className?: string;
	progress: number;
	size?: number;
	strokeWidth?: number;
}

const DownloadIcon = ({ isComplete }: { isComplete: boolean }) => (
	<svg
		className="absolute inset-0 m-auto"
		fill="none"
		height="44"
		viewBox="0 0 44 44"
		width="44"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M22.0013 32.6666L8.66797 19.3333L12.4013 15.4666L19.3346 22.4V0.666626H24.668V22.4L31.6013 15.4666L35.3346 19.3333L22.0013 32.6666ZM6.0013 43.3333C4.53464 43.3333 3.27908 42.8111 2.23464 41.7666C1.19019 40.7222 0.667969 39.4666 0.667969 38V30H6.0013V38H38.0013V30H43.3346V38C43.3346 39.4666 42.8124 40.7222 41.768 41.7666C40.7235 42.8111 39.468 43.3333 38.0013 43.3333H6.0013Z"
			fill={isComplete ? "#1E13F8" : "#D5D3DF"}
		/>
	</svg>
);

export default function CircularProgress({
	className = "",
	progress,
	size = 246,
	strokeWidth = 20,
}: CircularProgressProps) {
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference - (progress / 100) * circumference;
	const isComplete = progress >= 100;

	return (
		<div
			aria-live="polite"
			aria-valuemax={100}
			aria-valuemin={0}
			aria-valuenow={progress}
			className={`relative ${className}`}
			role="progressbar"
			style={{ height: size, width: size }}
		>
			<svg className="transform -rotate-90" height={size} width={size}>
				<circle
					cx={size / 2}
					cy={size / 2}
					fill="none"
					r={radius}
					stroke={isComplete ? "#FAF9FB" : "#fff"}
					strokeWidth={strokeWidth}
				/>
				{!isComplete && (
					<circle
						className="transition-all duration-300 ease-linear"
						cx={size / 2}
						cy={size / 2}
						fill="none"
						r={radius}
						stroke="#7068FF"
						strokeDasharray={circumference}
						strokeDashoffset={offset}
						strokeLinecap="round"
						strokeWidth={strokeWidth}
						style={{
							transition: "stroke-dashoffset 0.3s linear",
						}}
					/>
				)}
			</svg>

			<div
				className="absolute inset-0 flex items-center justify-center rounded-full bg-[#FAF9FB] transition-all duration-500"
				style={{
					height: size - strokeWidth,
					margin: strokeWidth / 2,
					width: size - strokeWidth,
				}}
			>
				<DownloadIcon isComplete={isComplete} />
			</div>
		</div>
	);
}
