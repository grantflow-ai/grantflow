import { CAREER_STAGES, type FormData } from "@/components/grant-finder/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CareerStageStepProps {
	formData: FormData;
	setFormData: (data: FormData) => void;
}

export function CareerStageStep({ formData, setFormData }: CareerStageStepProps) {
	return (
		<div className="space-y-6" data-testid="career-stage-step">
			<div data-testid="career-stage-step-header">
				<h3
					className="font-heading text-2xl font-medium leading-loose text-stone-900"
					data-testid="career-stage-step-title"
				>
					Career Stage
				</h3>
				<p
					className="mt-2 text-muted-foreground-dark text-sm leading-none"
					data-testid="career-stage-step-description"
				>
					How many years has it been since you earned your PhD?
				</p>
				<p
					className="mt-1 text-muted-foreground-dark text-sm leading-none"
					data-testid="career-stage-step-note"
				>
					Note: Certain FOAs limit eligibility to Early-Stage Investigators. Choose the option that matches
					your status.
				</p>
			</div>

			<div className="max-w-lg" data-testid="career-stage-select-section">
				<div
					className="block text-sm font-semibold text-stone-900 mb-1"
					data-testid="career-stage-select-label"
				>
					Select your career stage
				</div>
				<Select
					onValueChange={(value) => {
						setFormData({ ...formData, careerStage: value });
					}}
					value={formData.careerStage}
				>
					<SelectTrigger className="mt-1" data-testid="career-stage-select">
						<SelectValue placeholder="Choose career stage" />
					</SelectTrigger>
					<SelectContent>
						{CAREER_STAGES.map((stage) => (
							<SelectItem
								data-testid={`career-stage-option-${stage.toLowerCase().replaceAll(/[^a-z0-9]/g, "-")}`}
								key={stage}
								value={stage}
							>
								{stage}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
