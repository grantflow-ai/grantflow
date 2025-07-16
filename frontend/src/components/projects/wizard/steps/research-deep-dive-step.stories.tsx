import { ApplicationWithTemplateFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { ResearchDeepDiveStep } from "@/components/projects";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

const meta: Meta<typeof ResearchDeepDiveStep> = {
	component: ResearchDeepDiveStep,
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
	title: "Wizard/Steps/ResearchDeepDiveStep",
};

export default meta;
type Story = StoryObj<typeof ResearchDeepDiveStep>;

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
					currentStep: WizardStep.RESEARCH_DEEP_DIVE,
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
					currentStep: WizardStep.RESEARCH_DEEP_DIVE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "No Application",
};

export const ProcessingState: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = ApplicationWithTemplateFactory.build({
					title: "Climate Change Research Grant",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: true,
				});
				useWizardStore.setState({
					currentStep: WizardStep.RESEARCH_DEEP_DIVE,
				});
			}, []);
			return <Story />;
		},
	],
};
