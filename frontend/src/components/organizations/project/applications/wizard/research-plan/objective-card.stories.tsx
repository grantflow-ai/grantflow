import { ResearchObjectiveFactory, ResearchTaskFactory } from "::testing/factories";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import type { ResearchObjective } from "@/stores/wizard-store";
import { DraggableObjectiveCard } from "./draggable-objective-card";

const singleCardDecorator = [
	(Story: any) => (
		<div className="min-h-screen bg-light p-8">
			<div className="max-w-md mx-auto">
				<Story />
			</div>
		</div>
	),
];

const meta: Meta<typeof DraggableObjectiveCard> = {
	component: DraggableObjectiveCard,
	parameters: {
		layout: "fullscreen",
	},
	title: "Wizard/Components/ObjectiveCard",
};

export default meta;
type Story = StoryObj<typeof DraggableObjectiveCard>;

const DraggableWrapper = ({
	index = 1,
	initialEditing = false,
	objective,
	objectivesCount = 3,
}: {
	index?: number;
	initialEditing?: boolean;
	objective: ResearchObjective;
	objectivesCount?: number;
}) => {
	const [isEditing, setIsEditing] = useState(initialEditing);
	const [currentObjective, setCurrentObjective] = useState(objective);
	const itemIds = useMemo(() => [String(objective.number)], [objective.number]);

	return (
		<DndContext>
			<SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
				<DraggableObjectiveCard
					index={index}
					isEditing={isEditing}
					objective={currentObjective}
					objectivesCount={objectivesCount}
					onCancel={() => {
						setIsEditing(false);
					}}
					onEdit={() => {
						setIsEditing(true);
					}}
					onRemove={() => {
						// ~keep - No-op for Storybook demo
					}}
					onSave={(updated) => {
						setCurrentObjective(updated);
						setIsEditing(false);
						return Promise.resolve();
					}}
				/>
			</SortableContext>
			<DragOverlay />
		</DndContext>
	);
};

export const Default: Story = {
	args: {
		index: 1,
		isEditing: false,
		objective: ResearchObjectiveFactory.build({
			description:
				"Develop a comprehensive understanding of current climate change impacts on urban infrastructure to inform our proposed solutions.",
			number: 1,
			research_tasks: [
				ResearchTaskFactory.build({
					description: "Review latest IPCC reports on urban climate impacts",
					number: 1,
					title: "Climate Impact Analysis",
				}),
				ResearchTaskFactory.build({
					description: "Analyze case studies from similar urban environments",
					number: 2,
					title: "Case Study Research",
				}),
				ResearchTaskFactory.build({
					description: "Interview local infrastructure experts and stakeholders",
					number: 3,
					title: "Stakeholder Interviews",
				}),
			],
			title: "Assess Climate Change Impact on Urban Infrastructure",
		}),
		objectivesCount: 3,
	},
	decorators: singleCardDecorator,
	render: (args) => <DraggableWrapper {...args} />,
};

export const EditingMode: Story = {
	args: {
		index: 2,
		objective: ResearchObjectiveFactory.build({
			description:
				"Identify and evaluate innovative technologies that can enhance urban resilience against climate change effects.",
			number: 2,
			research_tasks: [
				ResearchTaskFactory.build({
					description: "Research emerging smart city technologies",
					number: 1,
					title: "Technology Survey",
				}),
				ResearchTaskFactory.build({
					description: "Evaluate cost-benefit of different solutions",
					number: 2,
					title: "Cost Analysis",
				}),
			],
			title: "Evaluate Resilience Technologies",
		}),
		objectivesCount: 4,
	},
	decorators: singleCardDecorator,
	render: (args) => <DraggableWrapper {...args} initialEditing={true} />,
};

export const SingleObjective: Story = {
	args: {
		index: 1,
		objective: ResearchObjectiveFactory.build({
			description: "This is the only objective, so it cannot be dragged or reordered.",
			number: 1,
			research_tasks: [
				ResearchTaskFactory.build({
					description: "Complete comprehensive research",
					number: 1,
					title: "Main Research Task",
				}),
			],
			title: "Single Primary Objective",
		}),
		objectivesCount: 1,
	},
	decorators: singleCardDecorator,
	name: "Single Objective (Drag Disabled)",
	render: (args) => <DraggableWrapper {...args} />,
};

export const LongContent: Story = {
	args: {
		index: 3,
		objective: ResearchObjectiveFactory.build({
			description:
				"This objective contains a very detailed description that spans multiple lines to demonstrate how the card handles longer content. It includes comprehensive research requirements, detailed methodologies, expected outcomes, and success metrics that will be used to evaluate the effectiveness of our proposed solutions in addressing the complex challenges of urban climate adaptation.",
			number: 3,
			research_tasks: [
				ResearchTaskFactory.build({
					description:
						"Conduct extensive literature review covering peer-reviewed journals, government reports, and industry white papers",
					number: 1,
					title: "Comprehensive Literature Review",
				}),
				ResearchTaskFactory.build({
					description:
						"Design and implement quantitative surveys targeting urban planners, engineers, and policy makers",
					number: 2,
					title: "Quantitative Survey Design and Implementation",
				}),
				ResearchTaskFactory.build({
					description:
						"Perform statistical analysis using advanced modeling techniques and machine learning algorithms",
					number: 3,
					title: "Advanced Statistical Analysis",
				}),
				ResearchTaskFactory.build({
					description:
						"Synthesize findings into actionable recommendations with clear implementation roadmaps",
					number: 4,
					title: "Synthesis and Recommendations",
				}),
				ResearchTaskFactory.build({
					description: "Develop visualization tools and dashboards for stakeholder communication",
					number: 5,
					title: "Data Visualization Development",
				}),
			],
			title: "Develop Comprehensive Climate Adaptation Framework for Metropolitan Areas with Focus on Sustainable Infrastructure",
		}),
		objectivesCount: 5,
	},
	decorators: singleCardDecorator,
	render: (args) => <DraggableWrapper {...args} />,
};

export const EmptyTasks: Story = {
	args: {
		index: 1,
		objective: ResearchObjectiveFactory.build({
			description: "This objective has no research tasks defined yet.",
			number: 1,
			research_tasks: [],
			title: "Objective Without Tasks",
		}),
		objectivesCount: 2,
	},
	decorators: singleCardDecorator,
	name: "No Research Tasks",
	render: (args) => <DraggableWrapper {...args} />,
};

export const MinimalContent: Story = {
	args: {
		index: 4,
		objective: ResearchObjectiveFactory.build({
			description: "Brief description.",
			number: 4,
			research_tasks: [
				ResearchTaskFactory.build({
					description: "Task 1",
					number: 1,
					title: "T1",
				}),
			],
			title: "Short Title",
		}),
		objectivesCount: 5,
	},
	decorators: singleCardDecorator,
	render: (args) => <DraggableWrapper {...args} />,
};

const HorizontalObjectivesWrapper = ({ count }: { count: number }) => {
	const [objectives, setObjectives] = useState<ResearchObjective[]>(() => {
		return Array.from({ length: count }, (_, i) =>
			ResearchObjectiveFactory.build({
				description: `Objective ${i + 1} description that demonstrates content in horizontal layout.`,
				number: i + 1,
				research_tasks: [
					ResearchTaskFactory.build({
						description: `Research task for objective ${i + 1}`,
						number: 1,
						title: `Task ${i + 1}.1`,
					}),
					...(i % 2 === 0
						? [
								ResearchTaskFactory.build({
									description: `Additional task for objective ${i + 1}`,
									number: 2,
									title: `Task ${i + 1}.2`,
								}),
							]
						: []),
				],
				title: `Research Objective ${i + 1}`,
			}),
		);
	});
	const [editingId, setEditingId] = useState<null | number>(null);

	const handleCancel = () => {
		setEditingId(null);
	};
	const handleEdit = (objectiveNumber: number) => {
		setEditingId(objectiveNumber);
	};
	const handleRemove = (objectiveNumber: number) => {
		setObjectives((prev) => prev.filter((o) => o.number !== objectiveNumber));
	};
	const handleSave = (updated: ResearchObjective) => {
		setObjectives((prev) => prev.map((o) => (o.number === updated.number ? updated : o)));
		setEditingId(null);
		return Promise.resolve();
	};

	return (
		<DndContext>
			<SortableContext
				items={objectives.map((obj) => String(obj.number))}
				strategy={horizontalListSortingStrategy}
			>
				<div className="flex gap-4 justify-start">
					{objectives.map((objective, idx) => (
						<div className="max-w-md" key={objective.number}>
							<DraggableObjectiveCard
								index={idx + 1}
								isEditing={editingId === objective.number}
								objective={objective}
								objectivesCount={objectives.length}
								onCancel={handleCancel}
								onEdit={() => {
									handleEdit(objective.number);
								}}
								onRemove={() => {
									handleRemove(objective.number);
								}}
								onSave={handleSave}
							/>
						</div>
					))}
				</div>
			</SortableContext>
			<DragOverlay />
		</DndContext>
	);
};

const horizontalDecorator = [
	(Story: any) => (
		<div className="min-h-screen bg-light p-8 w-full">
			<Story />
		</div>
	),
];

export const OneObjective: Story = {
	decorators: horizontalDecorator,
	name: "1 Objective (Horizontal)",
	parameters: {
		layout: "fullscreen",
	},
	render: () => <HorizontalObjectivesWrapper count={1} />,
};

export const TwoObjectives: Story = {
	decorators: horizontalDecorator,
	name: "2 Objectives (Horizontal)",
	parameters: {
		layout: "fullscreen",
	},
	render: () => <HorizontalObjectivesWrapper count={2} />,
};

export const ThreeObjectives: Story = {
	decorators: horizontalDecorator,
	name: "3 Objectives (Horizontal)",
	parameters: {
		layout: "fullscreen",
	},
	render: () => <HorizontalObjectivesWrapper count={3} />,
};

export const FourObjectives: Story = {
	decorators: horizontalDecorator,
	name: "4 Objectives (Horizontal)",
	parameters: {
		layout: "fullscreen",
	},
	render: () => <HorizontalObjectivesWrapper count={4} />,
};

export const FiveObjectives: Story = {
	decorators: horizontalDecorator,
	name: "5 Objectives (Horizontal)",
	parameters: {
		layout: "fullscreen",
	},
	render: () => <HorizontalObjectivesWrapper count={5} />,
};
