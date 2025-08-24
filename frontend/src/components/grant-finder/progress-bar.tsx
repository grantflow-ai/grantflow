interface ProgressBarProps {
	currentStep: number;
	steps: string[];
}

export function ProgressBar({ currentStep, steps }: ProgressBarProps) {
	const getCircleContent = (index: number) => {
		const isActive = index === currentStep;
		const isCompleted = index < currentStep;

		if (isCompleted) {
			return (
				<svg className="block h-full w-full" fill="none" viewBox="0 0 16 16">
					<circle cx="8" cy="8" fill="#2563eb" r="8" />
					<path
						d="M5 8l2 2 4-4"
						stroke="white"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
					/>
				</svg>
			);
		}
		if (isActive) {
			return (
				<svg className="block h-full w-full" fill="none" viewBox="0 0 16 16">
					<circle cx="8" cy="8" r="7.5" stroke="#2563eb" />
					<circle cx="8" cy="8" fill="#2563eb" r="2.5" />
				</svg>
			);
		}
		return (
			<svg className="block h-full w-full" fill="none" viewBox="0 0 16 16">
				<circle cx="8" cy="8" r="7.5" stroke="#d1d5db" />
			</svg>
		);
	};

	const getTextColor = (index: number) => {
		const isActive = index === currentStep;
		const isCompleted = index < currentStep;

		if (isCompleted) return "text-blue-800";
		if (isActive) return "text-blue-600";
		return "text-gray-400";
	};

	return (
		<div className="w-full" data-testid="progress-bar">
			{/* Progress line and circles container */}
			<div className="relative mb-3 h-4" data-testid="progress-bar-container">
				{/* Progress lines */}
				<div
					className="absolute top-2 flex h-px bg-gray-300"
					data-testid="progress-bar-lines"
					style={{
						left: `${100 / (steps.length * 2)}%`,
						right: `${100 / (steps.length * 2)}%`,
					}}
				>
					{steps.slice(0, -1).map((_, index) => {
						const isCompleted = index < currentStep;
						const segmentWidth = `${100 / (steps.length - 1)}%`;

						return (
							<div
								className="relative h-full"
								data-testid={`progress-bar-segment-${index}`}
								key={index}
								style={{ width: segmentWidth }}
							>
								<div
									className="h-full bg-blue-600 transition-all duration-300"
									data-testid={`progress-bar-fill-${index}`}
									style={{ width: isCompleted ? "100%" : "0%" }}
								/>
							</div>
						);
					})}
				</div>

				{/* Circles */}
				<div
					className="grid h-4 items-center"
					data-testid="progress-bar-circles"
					style={{
						gap: "0",
						gridTemplateColumns: `repeat(${steps.length}, 1fr)`,
					}}
				>
					{steps.map((step, index) => (
						<div
							className="flex justify-center"
							data-testid={`progress-bar-circle-container-${index}`}
							key={step}
						>
							<div
								className="relative z-10 h-4 w-4 rounded-full bg-white"
								data-testid={`progress-bar-circle-${index}`}
							>
								{getCircleContent(index)}
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Labels */}
			<div
				className="grid"
				data-testid="progress-bar-labels"
				style={{
					gap: "0",
					gridTemplateColumns: `repeat(${steps.length}, 1fr)`,
				}}
			>
				{steps.map((step, index) => (
					<div
						className="flex justify-center"
						data-testid={`progress-bar-label-container-${index}`}
						key={step}
					>
						<div
							className={`text-center text-sm font-medium ${getTextColor(index)}`}
							data-testid={`progress-bar-label-${index}`}
						>
							{step}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
