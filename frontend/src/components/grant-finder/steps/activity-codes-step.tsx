import { MultiSelect } from "@/components/app/forms/multi-select";
import { ACTIVITY_CODES, type FormData } from "@/components/grant-finder/types";

interface ActivityCodesStepProps {
	formData: FormData;
	setFormData: (data: FormData) => void;
}

export function ActivityCodesStep({ formData, setFormData }: ActivityCodesStepProps) {
	return (
		<div className="flex flex-col gap-6" data-testid="activity-codes-step">
			<div className="flex gap-2 flex-col h-[119px]" data-testid="activity-codes-step-header">
				<h3
					className="font-cabin text-[28px] font-medium leading-loose text-app-black"
					data-testid="activity-codes-step-title"
				>
					NIH Activity Codes
				</h3>
				<p
					className="text-base font-sans font-normal text-gray-600 leading-none"
					data-testid="activity-codes-step-description"
				>
					Select one or more grant mechanisms, or leave this blank to scan all FOAs.
				</p>
			</div>

			<div className="w-full" data-testid="activity-codes-select-section">
				<label className="font-sans text-xs font-normal text-app-gray-400">Activity codes</label>
				<MultiSelect
					data-testid="activity-codes-multiselect"
					onValueChange={(value) => {
						setFormData({ ...formData, activityCodes: value });
					}}
					options={ACTIVITY_CODES}
					placeholder="NIH activity codes"
					value={formData.activityCodes}
				/>
			</div>
		</div>
	);
}
