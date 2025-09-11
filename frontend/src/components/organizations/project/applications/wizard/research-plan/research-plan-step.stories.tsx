import { ApplicationWithTemplateFactory, ResearchObjectiveFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { ResearchPlanStep } from "./research-plan-step";

const meta: Meta<typeof ResearchPlanStep> = {
	component: ResearchPlanStep,
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
	title: "Wizard/Steps/ResearchPlanStep",
};

export default meta;
type Story = StoryObj<typeof ResearchPlanStep>;

export const EmptyState: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = ApplicationWithTemplateFactory.build({
					research_objectives: undefined,
					title: "Climate Change Research Grant",
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
	name: "Empty State - No Objectives",
};

export const WithSingleObjective: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const researchObjectives = [
					ResearchObjectiveFactory.build({
						description:
							"Evaluate the effects of rising sea levels and temperature changes on marine biodiversity in coastal regions.",
						number: 1,
						research_tasks: [
							{
								description:
									"Conduct comprehensive literature review on climate change impacts on marine ecosystems",
								number: 1,
								title: "Literature Review",
							},
							{
								description: "Analyze temperature and sea level data from coastal monitoring stations",
								number: 2,
								title: "Data Analysis",
							},
						],
						title: "Assess Climate Change Impact on Coastal Ecosystems",
					}),
				];

				const application = ApplicationWithTemplateFactory.build({
					research_objectives: researchObjectives,
					title: "Climate Change Research Grant",
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
};

export const WithMultipleObjectives: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const researchObjectives = [
					ResearchObjectiveFactory.build({
						description:
							"Evaluate the effects of rising sea levels and temperature changes on marine biodiversity in coastal regions.",
						number: 1,
						research_tasks: [
							{
								description: "Conduct comprehensive literature review on climate change impacts",
								number: 1,
								title: "Literature Review",
							},
						],
						title: "Assess Climate Change Impact on Coastal Ecosystems",
					}),
					ResearchObjectiveFactory.build({
						description:
							"Create sustainable solutions for coastal communities to adapt to changing environmental conditions.",
						number: 2,
						research_tasks: [
							{
								description: "Design community resilience frameworks",
								number: 1,
								title: "Resilience Frameworks",
							},
							{
								description: "Develop sustainable infrastructure solutions",
								number: 2,
								title: "Infrastructure Solutions",
							},
						],
						title: "Develop Adaptation Strategies",
					}),
					ResearchObjectiveFactory.build({
						description:
							"Establish monitoring systems to track ecosystem health and species migration patterns over time.",
						number: 3,
						research_tasks: [
							{
								description: "Deploy environmental monitoring equipment",
								number: 1,
								title: "Equipment Deployment",
							},
							{
								description: "Establish data collection protocols",
								number: 2,
								title: "Data Collection Protocols",
							},
							{
								description: "Create automated reporting systems",
								number: 3,
								title: "Automated Reporting",
							},
						],
						title: "Monitor Long-term Environmental Changes",
					}),
				];

				const application = ApplicationWithTemplateFactory.build({
					research_objectives: researchObjectives,
					title: "Climate Change Research Grant",
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
};

export const WithLongTitles: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const researchObjectives = [
					ResearchObjectiveFactory.build({
						description:
							"This objective involves conducting a detailed analysis of how climate change affects marine life in coastal areas, including temperature changes, ocean acidification, and sea level rise impacts on various species.",
						number: 1,
						research_tasks: [
							{
								description:
									"Conduct comprehensive field studies on marine biodiversity changes in coastal regions",
								number: 1,
								title: "Field Studies",
							},
							{
								description:
									"Analyze historical climate data and species population trends over the past 50 years",
								number: 2,
								title: "Historical Data Analysis",
							},
						],
						title: "Comprehensive Assessment of Climate Change Impact on Coastal Marine Ecosystems and Biodiversity Conservation Strategies",
					}),
					ResearchObjectiveFactory.build({
						description:
							"Focus on creating practical, sustainable, and economically viable solutions that help coastal communities adapt to the changing environmental conditions while maintaining their livelihoods.",
						number: 2,
						research_tasks: [
							{
								description:
									"Develop community-based adaptation strategies through stakeholder engagement",
								number: 1,
								title: "Community-Based Adaptation",
							},
						],
						title: "Development of Innovative Adaptation and Mitigation Strategies for Vulnerable Coastal Communities",
					}),
					ResearchObjectiveFactory.build({
						description:
							"Create comprehensive monitoring networks that can track environmental changes over extended periods and provide early warning systems for extreme weather events and ecosystem changes.",
						number: 3,
						research_tasks: [
							{
								description: "Design and deploy advanced environmental monitoring sensor networks",
								number: 1,
								title: "Sensor Networks",
							},
							{
								description: "Establish real-time data processing and early warning alert systems",
								number: 2,
								title: "Early Warning Systems",
							},
							{
								description: "Create predictive models for extreme weather event forecasting",
								number: 3,
								title: "Predictive Models",
							},
						],
						title: "Establishment of Long-term Environmental Monitoring and Early Warning Systems",
					}),
				];

				const application = ApplicationWithTemplateFactory.build({
					research_objectives: researchObjectives,
					title: "Climate Change Research Grant with Very Detailed Objectives",
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
	name: "With Long Titles and Descriptions",
};
