"use client";

import { AlertCircle, RotateCcw, Wand2 } from "lucide-react";
import { WizardStep } from "@/constants";
import { DevAutofillButton, DevResetButton } from "@/dev-tools";
import { useWizardStore } from "@/stores/wizard-store";

export function WizardTools() {
	const currentStep = useWizardStore((state) => state.currentStep);

	const setCurrentStep = (step: WizardStep) => {
		useWizardStore.setState({ currentStep: step });
	};
	const reset = useWizardStore((state) => state.reset);

	const steps = [
		WizardStep.APPLICATION_DETAILS,
		WizardStep.APPLICATION_STRUCTURE,
		WizardStep.KNOWLEDGE_BASE,
		WizardStep.RESEARCH_PLAN,
		WizardStep.RESEARCH_DEEP_DIVE,
		WizardStep.GENERATE_AND_COMPLETE,
	];

	const skipToStep = (step: WizardStep) => {
		setCurrentStep(step);
	};

	const simulateError = () => {
		alert("Simulated error - check console");
	};

	const fillAllSteps = async () => {
		for (const step of steps) {
			setCurrentStep(step);

			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	};

	return (
		<div className="space-y-4">
			<h4 className="font-medium">Wizard Tools</h4>

			<div className="rounded bg-gray-700 p-3">
				<p className="mb-2 text-sm">
					Current Step: <span className="font-bold text-purple-400">{currentStep}</span>
				</p>
				<div className="h-2 w-full rounded-full bg-gray-600">
					<div
						className="h-full rounded-full bg-purple-500 transition-all"
						style={{ width: `${((steps.indexOf(currentStep) + 1) / steps.length) * 100}%` }}
					/>
				</div>
			</div>

			<div className="grid gap-3 md:grid-cols-2">
				<DevAutofillButton />
				<DevResetButton />

				<button
					className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm hover:bg-red-700"
					onClick={() => {
						reset();
					}}
					type="button"
				>
					<RotateCcw className="h-4 w-4" />
					Reset Wizard
				</button>

				<button
					className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm hover:bg-green-700"
					onClick={fillAllSteps}
					type="button"
				>
					<Wand2 className="h-4 w-4" />
					Fill All Steps
				</button>

				<button
					className="flex items-center gap-2 rounded bg-orange-600 px-4 py-2 text-sm hover:bg-orange-700"
					onClick={simulateError}
					type="button"
				>
					<AlertCircle className="h-4 w-4" />
					Simulate Error
				</button>
			</div>

			<div className="space-y-2">
				<p className="text-sm font-medium">Jump to Step:</p>
				<div className="grid grid-cols-3 gap-2">
					{steps.map((step, index) => (
						<button
							className={`rounded px-3 py-1 text-xs ${
								currentStep === step
									? "bg-purple-600 text-white"
									: "bg-gray-700 text-gray-300 hover:bg-gray-600"
							}`}
							key={step}
							onClick={() => {
								skipToStep(step);
							}}
							type="button"
						>
							{index + 1}. {step.replaceAll("_", " ")}
						</button>
					))}
				</div>
			</div>

			<div className="mt-4 rounded bg-gray-700 p-3">
				<p className="text-xs text-gray-400">
					💡 Tip: Use autofill to quickly populate each step with realistic test data.
				</p>
			</div>
		</div>
	);
}
