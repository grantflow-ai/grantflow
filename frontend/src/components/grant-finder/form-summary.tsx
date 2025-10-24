import type { FormData } from "./types";

interface FormSummaryProps {
	formData: FormData;
}

const formatActivityCodes = (codes: string[]) => {
	if (codes.length === 0) return "All FOAs";
	if (codes.length === 1) return codes[0];
	if (codes.length <= 3) return codes.join(", ");
	return `${codes.slice(0, 2).join(", ")} and ${codes.length - 2} more`;
};

const truncateText = (text: string, maxLength: number) => {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, Math.max(0, maxLength))}...`;
};

export function FormSummary({ formData }: FormSummaryProps) {
	return (
		<div
			className="w-[378px]  bg-app-gray-20 border border-app-gray-100 rounded-[8px] py-4 px-[25px]"
			data-testid="form-summary"
		>
			<div className="space-y-6" data-testid="form-summary-content">
				<div className="flex flex-col gap-2" data-testid="form-summary-header">
					<h4 className="text-2xl font-medium font-cabin text-gray-900" data-testid="form-summary-title">
						Your Search Summary
					</h4>
					<p className=" text-sm font-sans text-app-gray-600" data-testid="form-summary-description">
						Review your selections below
					</p>
				</div>

				<div className="flex flex-col gap-2.5" data-testid="form-summary-grid">
					<div className="space-y-2" data-testid="form-summary-keywords">
						<div
							className="text-sm font-normal font-sans text-app-gray-600"
							data-testid="form-summary-keywords-label"
						>
							Keywords
						</div>
						<div
							className="text-sm font-normal font-sans text-app-black"
							data-testid="form-summary-keywords-value"
						>
							{formData.keywords ? truncateText(formData.keywords, 60) : "Not specified"}
						</div>
					</div>

					<div className="space-y-2" data-testid="form-summary-activity-codes">
						<div
							className="text-sm font-normal font-sans text-app-gray-600"
							data-testid="form-summary-activity-codes-label"
						>
							Activity codes
						</div>
						<div
							className="text-sm font-normal font-sans text-app-black"
							data-testid="form-summary-activity-codes-value"
						>
							{formatActivityCodes(formData.activityCodes)}
						</div>
					</div>

					<div className="space-y-2" data-testid="form-summary-institution-location">
						<div
							className="text-sm font-normal font-sans text-app-gray-600"
							data-testid="form-summary-institution-location-label"
						>
							Institution location
						</div>
						<div
							className="text-sm font-normal font-sans text-app-black"
							data-testid="form-summary-institution-location-value"
						>
							{formData.institutionLocation.length > 0
								? formData.institutionLocation.join(", ")
								: "Not specified"}
						</div>
					</div>

					<div className="space-y-2" data-testid="form-summary-career-stage">
						<div
							className="text-sm font-normal font-sans text-app-gray-600"
							data-testid="form-summary-career-stage-label"
						>
							Career stage
						</div>
						<div
							className="text-sm font-normal font-sans text-app-black"
							data-testid="form-summary-career-stage-value"
						>
							{formData.careerStage.length > 0 ? formData.careerStage.join(", ") : "Not specified"}
						</div>
					</div>

					<div className="space-y-2" data-testid="form-summary-email">
						<div
							className="text-sm font-normal font-sans text-app-gray-600"
							data-testid="form-summary-email-label"
						>
							Email for alerts
						</div>
						<div
							className="text-sm font-normal font-sans text-app-black break-all"
							data-testid="form-summary-email-value"
						>
							{formData.email || "Not specified"}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
