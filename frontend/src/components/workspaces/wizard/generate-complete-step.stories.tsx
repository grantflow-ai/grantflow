import { ApplicationWithTemplateFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { GenerateCompleteStep } from "./generate-complete-step";

const meta: Meta<typeof GenerateCompleteStep> = {
	component: GenerateCompleteStep,
	decorators: [
		(Story) => (
			<div className="h-screen w-screen">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "fullscreen",
	},
	title: "Components/Wizard/GenerateCompleteStep",
};

export default meta;
type Story = StoryObj<typeof GenerateCompleteStep>;

export const Default: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = ApplicationWithTemplateFactory.build({
					title: "Climate Change Research Grant",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.GENERATE_AND_COMPLETE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Default State",
};

export const WithoutApplication: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					application: null,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.GENERATE_AND_COMPLETE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "No Application",
};
