"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { createSubscription } from "@/actions/grants";
import { AppButton } from "@/components/app/buttons/app-button";
import type { API } from "@/types/api-types";
import { ProgressBar } from "./progress-bar";
import { ActivityCodesStep } from "./steps/activity-codes-step";
import { CareerStageStep } from "./steps/career-stage-step";
import { EmailAlertsStep } from "./steps/email-alerts-step";
import { InstitutionLocationStep } from "./steps/institution-location-step";
import { KeywordsStep } from "./steps/keywords-step";
import type { FormData } from "./types";

const emailAlertsSchema = z.object({
	agreeToTerms: z.literal(true, {
		message: "You must agree to the Terms & Conditions to continue",
	}),
	email: z.email(),
});

const WIZARD_STEPS = ["Keywords", "Activity codes", "Institution location", "Career stage", "Alerts Setting"];

export function SearchWizard() {
	const router = useRouter();
	const [currentStep, setCurrentStep] = useState(0);
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState<FormData>({
		activityCodes: [],
		agreeToTerms: false,
		agreeToUpdates: false,

		careerStage: [],
		email: "",
		institutionLocation: [],
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

	const handleSubmit = async () => {
		const validation = emailAlertsSchema.safeParse({
			agreeToTerms: formData.agreeToTerms,
			email: formData.email,
		});

		if (!validation.success) {
			const [firstError] = validation.error.issues;
			if (firstError) {
				toast.error(firstError.message);
			}
			return;
		}

		try {
			setLoading(true);

			const requestBody: API.CreateSubscription.RequestBody = {
				email: formData.email,
				search_params: {
					category: "",
					deadline_after: "",
					deadline_before: "",
					limit: 20,
					max_amount: 0,
					min_amount: 0,
					offset: 0,
					query: formData.keywords
						.split(",")
						.map((k) => k.trim())
						.filter(Boolean)
						.join(" "),
				},
			};

			await createSubscription(requestBody);

			toast.success("Success! Your NIH grant alerts are now active.", {
				description:
					"We'll notify you instantly when matching funding opportunities are announced. Check your email to confirm your subscription.",
				duration: 6000,
			});

			router.push("/");
		} catch {
			toast.error("Failed to create subscription. Please try again.");
		} finally {
			setLoading(false);
		}
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
				const validation = emailAlertsSchema.safeParse({
					agreeToTerms: formData.agreeToTerms,
					email: formData.email,
				});
				return validation.success;
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
		<div
			className="flex flex-col rounded-[8px] gap-10 border border-primary bg-white p-16 min-h-[714px]"
			data-testid="search-wizard"
		>
			<div className="flex flex-col gap-10">
				<div className="" data-testid="wizard-progress-bar">
					<ProgressBar currentStep={currentStep} steps={WIZARD_STEPS} />
				</div>

				<div className="min-h-[400px]" data-testid="wizard-step-content">
					{renderStep()}
				</div>
			</div>

			<div className="mt-auto flex items-end justify-between " data-testid="wizard-navigation">
				<AppButton
					className={
						currentStep === 0 ? "invisible" : "w-[128px] gap-1 items-center font-normal text-base font-sans"
					}
					data-testid="wizard-back-button"
					disabled={loading}
					onClick={handlePrevious}
					type="button"
					variant="secondary"
				>
					<ChevronLeft />
					Back
				</AppButton>

				{isLastStep ? (
					<AppButton
						className="w-[128px] gap-1 items-center font-normal text-base font-sans"
						data-testid="wizard-submit-button"
						disabled={!isStepValid() || loading}
						onClick={() => void handleSubmit()}
						size="lg"
						type="button"
						variant="primary"
					>
						{loading ? "Submitting..." : "Send"}
						<Image alt="send icon" height={12} src="/icons/send-icon.svg" width={12} />
					</AppButton>
				) : (
					<AppButton
						className="w-[128px] gap-1 items-center font-normal text-base font-sans"
						data-testid="wizard-next-button"
						disabled={!isStepValid()}
						onClick={handleNext}
						type="button"
						variant="primary"
					>
						Next
						<ChevronRight />
					</AppButton>
				)}
			</div>
		</div>
	);
}
