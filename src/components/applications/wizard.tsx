"use client";

import { useState } from "react";
import { Button } from "gen/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "gen/ui/card";
import { Step, Stepper } from "@/components/stepper";
import { GrantCFP } from "@/types/database-types";
import { CFPSelectionForm } from "@/components/applications/cfp-selection-form";
import { GeneralInformationForm } from "@/components/applications/general-information-form";
import SignificanceAndInnovationForm from "@/components/applications/significance-and-innovation-form";
import { ResearchAimProp, ResearchAimsForm, ResearchTaskProp } from "@/components/applications/research-aims-form";

const steps: Step[] = [
	{ index: 1, name: "CFP Selection" },
	{ index: 2, name: "General Information" },
	{ index: 3, name: "Significance and Innovation" },
	{ index: 4, name: "Research Plan" },
	{ index: 5, name: "Review" },
];

export function WizardFormPage({ cfps, workspaceId }: { cfps: GrantCFP[]; workspaceId: string }) {
	const [selectedCFP, setSelectedCFP] = useState("");
	const [title, setTitle] = useState("");
	const [isResubmission, setIsResubmission] = useState(false);
	const [significance, setSignificance] = useState("");
	const [innovation, setInnovation] = useState("");
	const [researchAims, setResearchAims] = useState<ResearchAimProp[]>([]);
	const [researchTasks, setResearchTasks] = useState<ResearchTaskProp[]>([]);

	const [currentStep, setCurrentStep] = useState(1);

	const handleStepClick = (step: number) => {
		setCurrentStep(step);
	};

	const handleNext = () => {
		if (currentStep < steps.length) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handlePrevious = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};

	const canStepForward = () => {
		if (currentStep === 1) {
			return !!selectedCFP;
		}
		if (currentStep === 2) {
			return title.length >= 25;
		}
		if (currentStep === 3) {
			return significance.length && innovation.length;
		}

		return currentStep !== steps.length;
	};

	return (
		<div className="container">
			<Card>
				<CardHeader>
					<CardTitle>
						<div className="mb-4">Grant Application Wizard</div>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-4 mb-4">
						<Stepper steps={steps} currentStep={currentStep} onStepClick={handleStepClick} />
						{currentStep === 1 && (
							<CFPSelectionForm cfps={cfps} value={selectedCFP} setValue={setSelectedCFP} />
						)}
						{currentStep === 2 && (
							<GeneralInformationForm
								title={title}
								isResubmission={isResubmission}
								setTitle={setTitle}
								setIsResubmission={setIsResubmission}
							/>
						)}
						{currentStep === 3 && (
							<SignificanceAndInnovationForm
								significance={significance}
								innovation={innovation}
								setSignificance={setSignificance}
								setInnovation={setInnovation}
							/>
						)}
						{currentStep === 4 && (
							<ResearchAimsForm
								researchAims={researchAims}
								researchTasks={researchTasks}
								setResearchAims={setResearchAims}
								setResearchTasks={setResearchTasks}
							/>
						)}
						{currentStep === steps.length && (
							<div>
								<h3 className="text-lg font-semibold mb-4">Review Your Information</h3>
								<p>Please review all the information you&apos;ve entered before submitting.</p>
								{/* You would typically display a summary of all entered information here */}
							</div>
						)}
					</div>
				</CardContent>
				<CardFooter className="flex justify-between">
					<Button onClick={handlePrevious} disabled={currentStep === 1}>
						Previous
					</Button>
					<Button onClick={handleNext} disabled={!canStepForward()}>
						{currentStep === steps.length ? "Submit" : "Next"}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
