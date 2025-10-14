import { MultiSelect } from "@/components/app/forms/multi-select";
import { ACTIVITY_CODES, type FormData } from "@/components/grant-finder/types";

interface ActivityCodesStepProps {
	formData: FormData;
	setFormData: (data: FormData) => void;
}

export function ActivityCodesStep({ formData, setFormData }: ActivityCodesStepProps) {
	return (
		<div className="space-y-6" data-testid="activity-codes-step">
			<div data-testid="activity-codes-step-header">
				<h3 className="text-2xl font-semibold text-dark" data-testid="activity-codes-step-title">
					NIH Activity Codes
				</h3>
				<p className="mt-2 text-muted" data-testid="activity-codes-step-description">
					Select one or more grant mechanisms, or leave this blank to scan all FOAs.
				</p>
			</div>

			<div className="max-w-lg" data-testid="activity-codes-select-section">
				<MultiSelect
					data-testid="activity-codes-multiselect"
					onValueChange={(value) => {
						setFormData({ ...formData, activityCodes: value });
					}}
					options={ACTIVITY_CODES}
					placeholder="Select activity codes (optional)"
					value={formData.activityCodes}
				/>
			</div>
		</div>
	);
}
