"use client";

import { useState } from "react";
import { Button } from "gen/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "gen/ui/card";
import { Input } from "gen/ui/input";
import { Label } from "gen/ui/label";
import { Step, Stepper } from "@/components/stepper";
import { GrantCFP } from "@/types/database-types";
import { CFPSelectionForm } from "@/components/applications/cfp-selection-form";

function GenericForm({ stepNumber }: { stepNumber: number }) {
	return (
		<div className="space-y-4">
			<div>
				<Label htmlFor={`field-${stepNumber}-1`}>Field 1</Label>
				<Input id={`field-${stepNumber}-1`} placeholder={`Step ${stepNumber} Field 1`} />
			</div>
			<div>
				<Label htmlFor={`field-${stepNumber}-2`}>Field 2</Label>
				<Input id={`field-${stepNumber}-2`} placeholder={`Step ${stepNumber} Field 2`} />
			</div>
			<div>
				<Label htmlFor={`field-${stepNumber}-3`}>Field 3</Label>
				<Input id={`field-${stepNumber}-3`} placeholder={`Step ${stepNumber} Field 3`} />
			</div>
		</div>
	);
}

const steps: Step[] = [
	{ index: 1, name: "CFP Selection" },
	{ index: 2, name: "General Information" },
	{ index: 3, name: "Significance and Innovation" },
	{ index: 4, name: "Research Plan" },
	{ index: 5, name: "Review" },
];

export function WizardFormPage({ cfps, workspaceId }: { cfps: GrantCFP[]; workspaceId: string }) {
	const [selectedCFP, setSelectedCFP] = useState("");
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
						{currentStep === 2 && <GenericForm stepNumber={2} />}
						{currentStep === 3 && <GenericForm stepNumber={3} />}
						{currentStep === 4 && (
							<div>
								<h3 className="text-lg font-semibold mb-4">Review Your Information</h3>
								<p>Please review all the information you've entered before submitting.</p>
								{/* You would typically display a summary of all entered information here */}
							</div>
						)}
					</div>
				</CardContent>
				<CardFooter className="flex justify-between">
					<Button onClick={handlePrevious} disabled={currentStep === 1}>
						Previous
					</Button>
					<Button onClick={handleNext} disabled={canStepForward}>
						{currentStep === steps.length ? "Submit" : "Next"}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
