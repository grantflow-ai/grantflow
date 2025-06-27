import { ApplicationWithTemplateFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { ApplicationStructureStep } from "./application-structure-step";

const meta: Meta<typeof ApplicationStructureStep> = {
	component: ApplicationStructureStep,
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
	title: "Components/Wizard/ApplicationStructureStep",
};

export default meta;
type Story = StoryObj<typeof ApplicationStructureStep>;

export const EmptyState: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					application: null,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.PREVIEW_AND_APPROVE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Empty State - No Content",
};

export const WithApplicationTitle: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = ApplicationWithTemplateFactory.build({
					grant_template: {
						...ApplicationWithTemplateFactory.build().grant_template!,
						grant_sections: [],
					},
					title: "Climate Change Research Grant",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.PREVIEW_AND_APPROVE,
				});
			}, []);
			return <Story />;
		},
	],
};

export const WithGeneratedSections: Story = {
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
					currentStep: WizardStep.PREVIEW_AND_APPROVE,
				});
			}, []);
			return <Story />;
		},
	],
};
