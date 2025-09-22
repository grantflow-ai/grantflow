import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "@storybook/test";
import { ObjectiveForm, type ObjectiveFormData } from "./objective-form";

const meta: Meta<typeof ObjectiveForm> = {
	argTypes: {
		objectiveNumber: {
			control: { max: 10, min: 1, type: "number" },
		},
		onSaveAction: { action: "onSaveAction" },
	},
	component: ObjectiveForm,
	decorators: [
		(Story) => (
			<div className="w-1/3 mx-auto p-8">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "fullscreen",
	},
	title: "Wizard/Components/ObjectiveForm",
};

export default meta;
type Story = StoryObj<typeof ObjectiveForm>;

export const Default: Story = {
	args: {
		objectiveNumber: 1,
		onSaveAction: fn(),
	},
};

export const SecondObjective: Story = {
	args: {
		objectiveNumber: 2,
		onSaveAction: fn(),
	},
};

export const WithInitialData: Story = {
	args: {
		initialData: {
			description:
				"Create and validate new treatment methodologies that improve patient outcomes while reducing costs and treatment duration.",
			tasks: [
				{
					description: "Conduct comprehensive literature review of existing treatment protocols",
					id: "1",
					number: 1,
					title: "Literature Review",
				},
				{
					description: "Design randomized controlled trial methodology",
					id: "2",
					number: 2,
					title: "Trial Design",
				},
				{
					description: "Recruit and train research staff for data collection",
					id: "3",
					number: 3,
					title: "Staff Training",
				},
			],
			title: "Develop innovative treatment protocols",
		} as ObjectiveFormData,
		objectiveNumber: 1,
		onSaveAction: fn(),
	},
};

export const OneTask: Story = {
	args: {
		initialData: {
			description:
				"Develop comprehensive methodologies for evaluating the effectiveness of new treatment approaches in clinical settings.",
			tasks: [
				{
					description: "Design and implement randomized controlled trial for treatment evaluation",
					id: "1",
					number: 1,
					title: "RCT Implementation",
				},
			],
			title: "Evaluate treatment effectiveness",
		} as ObjectiveFormData,
		objectiveNumber: 1,
		onSaveAction: fn(),
	},
};

export const MultipleTasks: Story = {
	args: {
		initialData: {
			description:
				"Build strategic alliances with local healthcare providers and community organizations to ensure sustainable implementation of research findings.",
			tasks: [
				{
					description: "Identify key stakeholders in the local healthcare ecosystem",
					id: "1",
					number: 1,
					title: "Stakeholder Identification",
				},
				{
					description: "Develop partnership agreements and MOUs",
					id: "2",
					number: 2,
					title: "Partnership Agreements",
				},
				{
					description: "Create joint governance structure for ongoing collaboration",
					id: "3",
					number: 3,
					title: "Governance Structure",
				},
				{
					description: "Establish data sharing protocols and agreements",
					id: "4",
					number: 4,
					title: "Data Sharing Protocols",
				},
			],
			title: "Establish community partnerships",
		} as ObjectiveFormData,
		objectiveNumber: 2,
		onSaveAction: fn(),
	},
};
