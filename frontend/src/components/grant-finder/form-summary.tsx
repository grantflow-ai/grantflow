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
		<div className="rounded-lg border border-gray-200 bg-gray-50 p-6" data-testid="form-summary">
			<div className="space-y-6" data-testid="form-summary-content">
				<div data-testid="form-summary-header">
					<h4 className="text-lg font-semibold text-gray-900" data-testid="form-summary-title">
						Your Search Summary
					</h4>
					<p className="mt-1 text-sm text-gray-600" data-testid="form-summary-description">
						Review your selections below
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-2" data-testid="form-summary-grid">
					{/* Keywords */}
					<div data-testid="form-summary-keywords">
						<div className="text-sm font-medium text-gray-600" data-testid="form-summary-keywords-label">
							Keywords
						</div>
						<div className="mt-1 text-sm text-gray-900" data-testid="form-summary-keywords-value">
							{formData.keywords ? truncateText(formData.keywords, 60) : "Not specified"}
						</div>
					</div>

					{/* Activity Codes */}
					<div data-testid="form-summary-activity-codes">
						<div
							className="text-sm font-medium text-gray-600"
							data-testid="form-summary-activity-codes-label"
						>
							Activity codes
						</div>
						<div className="mt-1 text-sm text-gray-900" data-testid="form-summary-activity-codes-value">
							{formatActivityCodes(formData.activityCodes)}
						</div>
					</div>

					{/* Institution Location */}
					<div data-testid="form-summary-institution-location">
						<div
							className="text-sm font-medium text-gray-600"
							data-testid="form-summary-institution-location-label"
						>
							Institution location
						</div>
						<div
							className="mt-1 text-sm text-gray-900"
							data-testid="form-summary-institution-location-value"
						>
							{formData.institutionLocation || "Not specified"}
						</div>
					</div>

					{/* Career Stage */}
					<div data-testid="form-summary-career-stage">
						<div
							className="text-sm font-medium text-gray-600"
							data-testid="form-summary-career-stage-label"
						>
							Career stage
						</div>
						<div className="mt-1 text-sm text-gray-900" data-testid="form-summary-career-stage-value">
							{formData.careerStage || "Not specified"}
						</div>
					</div>

					{/* Email */}
					<div className="sm:col-span-2" data-testid="form-summary-email">
						<div className="text-sm font-medium text-gray-600" data-testid="form-summary-email-label">
							Email for alerts
						</div>
						<div className="mt-1 break-all text-sm text-gray-900" data-testid="form-summary-email-value">
							{formData.email || "Not specified"}
						</div>
					</div>
				</div>

				{/* Preferences */}
				{(formData.agreeToTerms || formData.agreeToUpdates) && (
					<div className="border-t border-gray-200 pt-4" data-testid="form-summary-preferences">
						<div className="text-sm font-medium text-gray-600" data-testid="form-summary-preferences-label">
							Preferences
						</div>
						<div className="mt-2 flex flex-wrap gap-4" data-testid="form-summary-preferences-list">
							{formData.agreeToTerms && (
								<div className="flex items-center gap-2" data-testid="form-summary-preference-terms">
									<div
										className="h-2 w-2 rounded-full bg-blue-600"
										data-testid="form-summary-preference-terms-indicator"
									/>
									<span
										className="text-sm text-gray-900"
										data-testid="form-summary-preference-terms-text"
									>
										Terms & Conditions
									</span>
								</div>
							)}
							{formData.agreeToUpdates && (
								<div className="flex items-center gap-2" data-testid="form-summary-preference-updates">
									<div
										className="h-2 w-2 rounded-full bg-blue-600"
										data-testid="form-summary-preference-updates-indicator"
									/>
									<span
										className="text-sm text-gray-900"
										data-testid="form-summary-preference-updates-text"
									>
										GrantFlow updates
									</span>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
