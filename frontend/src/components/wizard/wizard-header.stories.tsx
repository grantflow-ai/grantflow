import { ApplicationWithTemplateFactory, GrantTemplateFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { WizardHeader } from "./wizard-wrapper-components";

const meta: Meta<typeof WizardHeader> = {
	component: WizardHeader,
	decorators: [
		(Story) => (
			<div className="min-h-screen bg-light">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "fullscreen",
	},
	title: "Components/Wizard/WizardHeader",
};

export default meta;
type Story = StoryObj<typeof WizardHeader>;

export const FirstStep: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build({
					submission_date: undefined,
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					project_id: "project-123",
					title: "",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 1: Application Details - No Title",
};

export const WithTitleAndDeadline: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build({
					submission_date: "2024-12-31T23:59:59Z",
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					project_id: "project-123",
					title: "Climate Change Research Grant Application",
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
	name: "Step 2: With Title and Deadline Shown",
};

export const SecondStep: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const futureDate = new Date();
				futureDate.setDate(futureDate.getDate() + 30);

				const grantTemplate = GrantTemplateFactory.build({
					submission_date: futureDate.toISOString(),
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					project_id: "project-123",
					title: "Climate Change Research Grant Application",
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
	name: "Step 2: Application Structure - 30 Days Remaining",
};

export const KnowledgeBaseStep: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build({
					submission_date: "2024-12-31T23:59:59Z",
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					project_id: "project-456",
					title: "Quantum Computing Research Proposal",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 3: Knowledge Base",
};

export const ResearchPlanStep: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const urgentDate = new Date();
				urgentDate.setDate(urgentDate.getDate() + 7);

				const grantTemplate = GrantTemplateFactory.build({
					submission_date: urgentDate.toISOString(),
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					project_id: "project-789",
					title: "AI-Powered Healthcare Diagnostics System",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.RESEARCH_PLAN,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 4: Research Plan - 1 Week Remaining",
};

export const ResearchDeepDiveStep: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const veryUrgentDate = new Date();
				veryUrgentDate.setDate(veryUrgentDate.getDate() + 2);

				const grantTemplate = GrantTemplateFactory.build({
					submission_date: veryUrgentDate.toISOString(),
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					project_id: "project-abc",
					title: "Virtual Reality Learning Platform for STEM Education",
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
	name: "Step 5: Research Deep Dive - Urgent (2 Days)",
};

export const FinalStep: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build({
					submission_date: "2024-12-31T23:59:59Z",
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					project_id: "project-123",
					title: "Climate Change Research Grant Application",
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
	name: "Step 6: Generate and Complete",
};

export const NoDeadlineSet: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build({
					submission_date: undefined,
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					project_id: "project-xyz",
					title: "Exploratory Research Project",
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
	name: "No Deadline Set - Step 2",
};

export const DeadlinePassed: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const pastDate = new Date();
				pastDate.setDate(pastDate.getDate() - 5);

				const grantTemplate = GrantTemplateFactory.build({
					submission_date: pastDate.toISOString(),
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					project_id: "project-123",
					title: "Climate Change Research Grant Application",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Deadline Passed - 5 Days Ago",
};

export const MaxLengthTitle: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build({
					submission_date: "2024-12-31T23:59:59Z",
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					project_id: "project-max",
					title: "An Interdisciplinary Approach to Understanding Climate Change Impact on Urban Infrastructure and Community Resilience X",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.RESEARCH_PLAN,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Max Length Title - 120 Characters Exactly",
};

export const TruncatedTitle: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build({
					submission_date: "2024-12-31T23:59:59Z",
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					project_id: "project-truncated",
					title: "An Interdisciplinary Approach to Understanding Climate Change Impact on Urban Infrastructure and Community Resilience Through Advanced Machine Learning and Social Network Analysis Methods",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.RESEARCH_PLAN,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Truncated Title - Over 120 Characters with Ellipsis",
};

export const TabletResponsive: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build({
					submission_date: "2024-12-31T23:59:59Z",
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					project_id: "project-tablet",
					title: "Tablet Responsive Testing Application with Long Title",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.RESEARCH_PLAN,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Tablet View - Responsive Layout",
	parameters: {
		viewport: {
			defaultViewport: "tablet",
		},
	},
};
