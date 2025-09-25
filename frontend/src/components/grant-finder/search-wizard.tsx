"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FormSummary } from "./form-summary";
import { ProgressBar } from "./progress-bar";
import { ActivityCodesStep } from "./steps/activity-codes-step";
import { CareerStageStep } from "./steps/career-stage-step";
import { EmailAlertsStep } from "./steps/email-alerts-step";
import { InstitutionLocationStep } from "./steps/institution-location-step";
import { KeywordsStep } from "./steps/keywords-step";
import type { FormData, SearchParams } from "./types";

interface SearchWizardProps {
	onSubmit: (params: SearchParams) => void;
}

const WIZARD_STEPS = ["Keywords", "Activity codes", "Institution location", "Career stage", "Email for alerts"];

export function SearchWizard({ onSubmit }: SearchWizardProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const [formData, setFormData] = useState<FormData>({
		activityCodes: [],
		agreeToTerms: false,
		agreeToUpdates: false,
		careerStage: "",
		email: "",
		institutionLocation: "",
		keywords: "",
	});

	const handleNext = () => {
		if (currentStep < WIZARD_STEPS.length - 1) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handlePrevious = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleSubmit = () => {
		const searchParams: SearchParams = {
			activityCodes: formData.activityCodes.length > 0 ? formData.activityCodes : undefined,
			careerStage: formData.careerStage || undefined,
			email: formData.email || undefined,
			institutionLocation: formData.institutionLocation || undefined,
			keywords: formData.keywords
				.split(",")
				.map((k) => k.trim())
				.filter(Boolean),
		};

		onSubmit(searchParams);

		toast.success("Success! Your NIH grant alerts are now active.", {
			description:
				"We'll notify you instantly when matching funding opportunities are announced. Check your email to confirm your subscription.",
			duration: 6000,
		});
	};

	const isStepValid = () => {
		switch (currentStep) {
			case 0: {
				return formData.keywords.trim().length > 0;
			}
			case 1: {
				return true;
			}
			case 2: {
				return formData.institutionLocation.length > 0;
			}
			case 3: {
				return formData.careerStage.length > 0;
			}
			case 4: {
				return formData.email.length > 0 && formData.agreeToTerms;
			}
			default: {
				return false;
			}
		}
	};

	const renderStep = () => {
		switch (currentStep) {
			case 0: {
				return <KeywordsStep formData={formData} setFormData={setFormData} />;
			}
			case 1: {
				return <ActivityCodesStep formData={formData} setFormData={setFormData} />;
			}
			case 2: {
				return <InstitutionLocationStep formData={formData} setFormData={setFormData} />;
			}
			case 3: {
				return <CareerStageStep formData={formData} setFormData={setFormData} />;
			}
			case 4: {
				return <EmailAlertsStep formData={formData} setFormData={setFormData} />;
			}
			default: {
				return null;
			}
		}
	};

	const isLastStep = currentStep === WIZARD_STEPS.length - 1;

	return (
		<div className="rounded-xl border border-blue-600 bg-white p-8 lg:p-12" data-testid="search-wizard">
			{}
			<div className="mb-12" data-testid="wizard-progress-bar">
				<ProgressBar currentStep={currentStep} steps={WIZARD_STEPS} />
			</div>

			{}
			<div className="mb-8 min-h-[400px]" data-testid="wizard-step-content">
				{renderStep()}
			</div>

			{}
			{isLastStep && (
				<div className="mb-8" data-testid="wizard-form-summary">
					<FormSummary formData={formData} />
				</div>
			)}

			{}
			<div className="flex justify-between" data-testid="wizard-navigation">
				<button
					className={`rounded-md border border-blue-600 px-6 py-2 text-blue-600 transition-colors hover:bg-blue-50 ${
						currentStep === 0 ? "invisible" : ""
					}`}
					data-testid="wizard-back-button"
					onClick={handlePrevious}
					type="button"
				>
					Back
				</button>

				{isLastStep ? (
					<button
						className={`rounded-md px-6 py-2 text-white transition-colors ${
							isStepValid() ? "bg-blue-600 hover:bg-blue-700" : "cursor-not-allowed bg-gray-300"
						}`}
						data-testid="wizard-submit-button"
						disabled={!isStepValid()}
						onClick={handleSubmit}
						type="button"
					>
						Get Alerts
					</button>
				) : (
					<button
						className={`rounded-md px-6 py-2 text-white transition-colors ${
							isStepValid() ? "bg-blue-600 hover:bg-blue-700" : "cursor-not-allowed bg-gray-300"
						}`}
						data-testid="wizard-next-button"
						disabled={!isStepValid()}
						onClick={handleNext}
						type="button"
					>
						Next
					</button>
				)}
			</div>
		</div>
	);
}
