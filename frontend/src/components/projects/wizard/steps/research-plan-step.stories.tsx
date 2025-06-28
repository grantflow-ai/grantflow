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
	title: "Components/Wizard/ResearchPlanStep",
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
						research_tasks: [],
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
						research_tasks: [],
						title: "Assess Climate Change Impact on Coastal Ecosystems",
					}),
					ResearchObjectiveFactory.build({
						description:
							"Create sustainable solutions for coastal communities to adapt to changing environmental conditions.",
						number: 2,
						research_tasks: [],
						title: "Develop Adaptation Strategies",
					}),
					ResearchObjectiveFactory.build({
						description:
							"Establish monitoring systems to track ecosystem health and species migration patterns over time.",
						number: 3,
						research_tasks: [],
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

export const WithManyObjectives: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const researchObjectives = [
					ResearchObjectiveFactory.build({
						description:
							"Evaluate the effects of rising sea levels and temperature changes on marine biodiversity.",
						number: 1,
						research_tasks: [],
						title: "Assess Climate Change Impact on Coastal Ecosystems",
					}),
					ResearchObjectiveFactory.build({
						description:
							"Create sustainable solutions for coastal communities to adapt to changing conditions.",
						number: 2,
						research_tasks: [],
						title: "Develop Adaptation Strategies",
					}),
					ResearchObjectiveFactory.build({
						description: "Establish monitoring systems to track ecosystem health and species migration.",
						number: 3,
						research_tasks: [],
						title: "Monitor Long-term Environmental Changes",
					}),
					ResearchObjectiveFactory.build({
						description: "Develop outreach programs to educate local communities about climate adaptation.",
						number: 4,
						research_tasks: [],
						title: "Community Engagement and Education",
					}),
					ResearchObjectiveFactory.build({
						description:
							"Formulate evidence-based policy recommendations for sustainable coastal management.",
						number: 5,
						research_tasks: [],
						title: "Policy Recommendations",
					}),
					ResearchObjectiveFactory.build({
						description: "Develop innovative technologies for ecosystem monitoring and restoration.",
						number: 6,
						research_tasks: [],
						title: "Technology Innovation",
					}),
					ResearchObjectiveFactory.build({
						description: "Establish partnerships with global research institutions for data sharing.",
						number: 7,
						research_tasks: [],
						title: "International Collaboration",
					}),
					ResearchObjectiveFactory.build({
						description: "Analyze the economic implications of climate change on coastal industries.",
						number: 8,
						research_tasks: [],
						title: "Economic Impact Analysis",
					}),
				];

				const application = ApplicationWithTemplateFactory.build({
					research_objectives: researchObjectives,
					title: "Comprehensive Climate Change Research Initiative",
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
	name: "Many Objectives (Grid Layout)",
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
						research_tasks: [],
						title: "Comprehensive Assessment of Climate Change Impact on Coastal Marine Ecosystems and Biodiversity Conservation Strategies",
					}),
					ResearchObjectiveFactory.build({
						description:
							"Focus on creating practical, sustainable, and economically viable solutions that help coastal communities adapt to the changing environmental conditions while maintaining their livelihoods.",
						number: 2,
						research_tasks: [],
						title: "Development of Innovative Adaptation and Mitigation Strategies for Vulnerable Coastal Communities",
					}),
					ResearchObjectiveFactory.build({
						description:
							"Create comprehensive monitoring networks that can track environmental changes over extended periods and provide early warning systems for extreme weather events and ecosystem changes.",
						number: 3,
						research_tasks: [],
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
