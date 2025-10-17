import { MultiSelect } from "@/components/app/forms/multi-select";
import { CAREER_STAGES, type FormData } from "@/components/grant-finder/types";

interface CareerStageStepProps {
	formData: FormData;
	setFormData: (data: FormData) => void;
}

export function CareerStageStep({ formData, setFormData }: CareerStageStepProps) {
	return (
		<div className="flex flex-col gap-6" data-testid="career-stage-step">
			<div className="flex gap-2 flex-col h-[119px]" data-testid="career-stage-step-header">
				<h3
					className="font-cabin text-[28px] font-medium leading-loose text-app-black"
					data-testid="career-stage-step-title"
				>
					Career Stage
				</h3>
				<p
					className="text-base font-sans font-normal text-gray-600 leading-none"
					data-testid="career-stage-step-description"
				>
					How many years has it been since you earned your PhD?
				</p>
				<p
					className="text-base font-sans font-normal text-gray-600 leading-none"
					data-testid="career-stage-step-note"
				>
					Note: Certain FOAs limit eligibility to Early-Stage Investigators. Choose the option that matches
					your status.
				</p>
			</div>

			<div className="w-full" data-testid="career-stage-select-section">
				<label className="font-sans text-xs font-normal text-app-gray-400">Career stage</label>
				<MultiSelect
					data-testid="career-stage-multiselect"
					onValueChange={(value) => {
						setFormData({ ...formData, careerStage: value });
					}}
					options={CAREER_STAGES}
					placeholder="Choose career stage"
					value={formData.careerStage}
				/>
			</div>
		</div>
	);
}
