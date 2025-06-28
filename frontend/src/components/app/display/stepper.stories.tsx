import type { Meta, StoryObj } from "@storybook/react-vite";
import React, { useState } from "react";
import { action } from "storybook/actions";
import { Stepper } from "./stepper";

const meta: Meta<typeof Stepper> = {
	component: Stepper,
	parameters: {
		layout: "padded",
	},
	title: "Components/Stepper",
};

export default meta;
type Story = StoryObj<typeof Stepper>;

export const Default: Story = {
	args: {
		currentStep: 0,
		onStepClick: action("step-clicked"),
		steps: ["Step 1", "Step 2", "Step 3", "Step 4"],
	},
};

export const SecondStep: Story = {
	args: {
		currentStep: 1,
		onStepClick: action("step-clicked"),
		steps: ["Step 1", "Step 2", "Step 3", "Step 4"],
	},
	name: "On Second Step",
};

export const LastStep: Story = {
	args: {
		currentStep: 3,
		onStepClick: action("step-clicked"),
		steps: ["Step 1", "Step 2", "Step 3", "Step 4"],
	},
	name: "On Last Step",
};

export const TwoSteps: Story = {
	args: {
		currentStep: 0,
		onStepClick: action("step-clicked"),
		steps: ["Start", "Finish"],
	},
};

export const ManySteps: Story = {
	args: {
		currentStep: 2,
		onStepClick: action("step-clicked"),
		steps: ["Introduction", "Details", "Review", "Submit", "Confirmation", "Complete"],
	},
	name: "Many Steps (6)",
};

export const LongTitles: Story = {
	args: {
		currentStep: 1,
		onStepClick: action("step-clicked"),
		steps: [
			"Personal Information",
			"Professional Background",
			"Educational Qualifications",
			"Additional Documentation",
		],
	},
	name: "With Long Titles",
};

export const WizardSteps: Story = {
	args: {
		currentStep: 2,
		onStepClick: action("step-clicked"),
		steps: ["Knowledge Base", "Research Plan", "Deep Dive", "Details", "Generate"],
	},
	name: "Wizard-Style Steps",
};

export const Interactive: Story = {
	name: "Interactive Example",
	render: function InteractiveExample() {
		const [currentStep, setCurrentStep] = useState(0);
		const steps = React.useMemo(() => ["Getting Started", "Configuration", "Review", "Deploy"], []);

		return (
			<div className="mx-auto w-full max-w-4xl">
				<Stepper currentStep={currentStep} onStepClick={setCurrentStep} steps={steps} />
				<div className="bg-muted mt-8 rounded-lg p-6">
					<h3 className="mb-2 text-lg font-semibold">Current Step: {steps[currentStep]}</h3>
					<p className="text-muted-foreground">
						Click on any step above to navigate. The progress bar will update to show your current position.
					</p>
				</div>
			</div>
		);
	},
};

export const SingleStep: Story = {
	args: {
		currentStep: 0,
		onStepClick: action("step-clicked"),
		steps: ["Only Step"],
	},
	name: "Single Step Only",
};

export const CompletedJourney: Story = {
	args: {
		currentStep: 4,
		onStepClick: action("step-clicked"),
		steps: ["Start", "Middle", "Almost There", "Final Step", "Complete"],
	},
};

export const ResponsiveDemo: Story = {
	args: {
		currentStep: 1,
		onStepClick: action("step-clicked"),
		steps: ["First", "Second", "Third", "Fourth"],
	},
	decorators: [
		(Story) => (
			<div className="space-y-8">
				<div className="w-full">
					<h3 className="mb-2 text-sm font-medium">Full Width</h3>
					<Story />
				</div>
				<div className="w-96">
					<h3 className="mb-2 text-sm font-medium">Fixed Width (384px)</h3>
					<Story />
				</div>
				<div className="w-64">
					<h3 className="mb-2 text-sm font-medium">Narrow Width (256px)</h3>
					<Story />
				</div>
			</div>
		),
	],
	name: "Responsive Widths",
};