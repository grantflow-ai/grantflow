import { CAREER_STAGES, type FormData } from "@/components/grant-finder/types";

interface CareerStageStepProps {
	formData: FormData;
	setFormData: (data: FormData) => void;
}

export function CareerStageStep({ formData, setFormData }: CareerStageStepProps) {
	return (
		<div className="space-y-6" data-testid="career-stage-step">
			<div data-testid="career-stage-step-header">
				<h3 className="text-2xl font-semibold text-gray-900" data-testid="career-stage-step-title">
					Career Stage
				</h3>
				<p className="mt-2 text-gray-600" data-testid="career-stage-step-description">
					How many years has it been since you earned your PhD?
				</p>
				<p className="mt-1 text-sm text-gray-500" data-testid="career-stage-step-note">
					Note: Certain FOAs limit eligibility to Early-Stage Investigators. Choose the option that matches
					your status.
				</p>
			</div>

			<div className="max-w-lg" data-testid="career-stage-select-section">
				<label
					className="block text-sm font-medium text-gray-700"
					data-testid="career-stage-select-label"
					htmlFor="career"
				>
					Select your career stage
				</label>
				<select
					className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					data-testid="career-stage-select"
					id="career"
					onChange={(e) => {
						setFormData({ ...formData, careerStage: e.target.value });
					}}
					value={formData.careerStage}
				>
					<option data-testid="career-stage-default-option" value="">
						Choose career stage
					</option>
					{CAREER_STAGES.map((stage) => (
						<option
							data-testid={`career-stage-option-${stage.toLowerCase().replaceAll(/[^a-z0-9]/g, "-")}`}
							key={stage}
							value={stage}
						>
							{stage}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
