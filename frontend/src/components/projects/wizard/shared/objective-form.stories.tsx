import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "@storybook/test";
import { ObjectiveForm, type ObjectiveFormData } from "./objective-form";

const meta: Meta<typeof ObjectiveForm> = {
	argTypes: {
		objectiveNumber: {
			control: { max: 10, min: 1, type: "number" },
		},
		onSave: { action: "onSave" },
	},
	component: ObjectiveForm,
	parameters: {
		layout: "padded",
	},
	title: "Projects/Wizard/ObjectiveForm",
};

export default meta;
type Story = StoryObj<typeof ObjectiveForm>;

export const Default: Story = {
	args: {
		objectiveNumber: 1,
		onSave: fn(),
	},
};

export const SecondObjective: Story = {
	args: {
		objectiveNumber: 2,
		onSave: fn(),
	},
};

export const WithInitialData: Story = {
	args: {
		initialData: {
			description:
				"Create and validate new treatment methodologies that improve patient outcomes while reducing costs and treatment duration.",
			name: "Develop innovative treatment protocols",
			tasks: [
				{
					description: "Conduct comprehensive literature review of existing treatment protocols",
					id: "1",
				},
				{
					description: "Design randomized controlled trial methodology",
					id: "2",
				},
				{
					description: "Recruit and train research staff for data collection",
					id: "3",
				},
			],
		} as ObjectiveFormData,
		objectiveNumber: 1,
		onSave: fn(),
	},
};

export const MultipleObjectives: Story = {
	args: {
		initialData: {
			description:
				"Build strategic alliances with local healthcare providers and community organizations to ensure sustainable implementation of research findings.",
			name: "Establish community partnerships",
			tasks: [
				{
					description: "Identify key stakeholders in the local healthcare ecosystem",
					id: "1",
				},
				{
					description: "Develop partnership agreements and MOUs",
					id: "2",
				},
				{
					description: "Create joint governance structure for ongoing collaboration",
					id: "3",
				},
				{
					description: "Establish data sharing protocols and agreements",
					id: "4",
				},
			],
		} as ObjectiveFormData,
		objectiveNumber: 3,
		onSave: fn(),
	},
};

export const EmptyForm: Story = {
	args: {
		initialData: {
			description: "",
			name: "",
			tasks: [{ description: "", id: "1" }],
		} as ObjectiveFormData,
		objectiveNumber: 1,
		onSave: fn(),
	},
};
