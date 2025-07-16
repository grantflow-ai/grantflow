import { ApplicationWithTemplateFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { ApplicationStructureStep } from "@/components/projects";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

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
	title: "Wizard/Steps/ApplicationStructureStep",
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
					currentStep: WizardStep.APPLICATION_STRUCTURE,
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
					currentStep: WizardStep.APPLICATION_STRUCTURE,
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
					currentStep: WizardStep.APPLICATION_STRUCTURE,
				});
			}, []);
			return <Story />;
		},
	],
};

export const LoadingState: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = ApplicationWithTemplateFactory.build({
					title: "AI Ethics Research Proposal",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: true,
				});
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_STRUCTURE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Loading State - Operations in Progress",
};

export const PartiallyCompleted: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = ApplicationWithTemplateFactory.build({
					grant_template: {
						...ApplicationWithTemplateFactory.build().grant_template!,
						grant_sections: [
							{
								id: "section-1",
								order: 1,
								parent_id: null,
								title: "Project Summary",
							},
							{
								id: "section-2",
								order: 2,
								parent_id: null,
								title: "Research Methodology",
							},
							{
								id: "section-3",
								order: 3,
								parent_id: null,
								title: "Budget Justification",
							},
						],
					},
					title: "Medical Research Grant Application",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_STRUCTURE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Partially Completed - Mixed Content States",
};

export const AllSectionsCompleted: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = ApplicationWithTemplateFactory.build({
					grant_template: {
						...ApplicationWithTemplateFactory.build().grant_template!,
						grant_sections: [
							{
								id: "section-1",
								order: 1,
								parent_id: null,
								title: "Executive Summary",
							},
							{
								id: "section-2",
								order: 2,
								parent_id: null,
								title: "Technical Approach",
							},
							{
								id: "section-3",
								order: 3,
								parent_id: null,
								title: "Market Impact",
							},
							{
								id: "section-4",
								order: 4,
								parent_id: null,
								title: "Risk Assessment",
							},
						],
					},
					title: "Renewable Energy Innovation Grant",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_STRUCTURE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "All Sections Completed - Ready for Review",
};

export const MinimalSingleSection: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = ApplicationWithTemplateFactory.build({
					grant_template: {
						...ApplicationWithTemplateFactory.build().grant_template!,
						grant_sections: [
							{
								id: "section-1",
								order: 1,
								parent_id: null,
								title: "Business Plan",
							},
						],
					},
					title: "Small Business Innovation Grant",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_STRUCTURE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Minimal - Single Section",
};

export const Manysections: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const sections = Array.from({ length: 8 }, (_, i) => ({
					id: `section-${i + 1}`,
					order: i + 1,
					parent_id: null,
					title: [
						"Project Overview",
						"Literature Review",
						"Research Methodology",
						"Data Collection Plan",
						"Analysis Framework",
						"Timeline and Milestones",
						"Budget and Resources",
						"Risk Management",
					][i],
				}));

				const application = ApplicationWithTemplateFactory.build({
					grant_template: {
						...ApplicationWithTemplateFactory.build().grant_template!,
						grant_sections: sections,
					},
					title: "Comprehensive Research Grant Application",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_STRUCTURE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Many Sections - Complex Application",
};
