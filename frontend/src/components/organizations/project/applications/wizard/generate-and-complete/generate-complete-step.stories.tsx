import type { Meta, StoryObj } from "@storybook/react-vite";
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
	title: "Wizard/Steps/GenerateCompleteStep",
};

export default meta;
type Story = StoryObj<typeof GenerateCompleteStep>;

export const StaticCongratulations: Story = {
	name: "Static Congratulations Page",
};
