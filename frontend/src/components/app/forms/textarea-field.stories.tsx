import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import AppTextArea from "./textarea-field";

const meta: Meta<typeof AppTextArea> = {
	component: AppTextArea,
	decorators: [
		(Story) => (
			<div className="max-w-lg w-md p-8">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "centered",
	},
	title: "Components/TextareaField",
};

export default meta;
type Story = StoryObj<typeof AppTextArea>;

export const Default: Story = {
	args: {
		label: "Default Textarea",
		onChange: action("changed"),
		placeholder: "Enter your text here...",
		testId: "default-textarea",
	},
};

export const WithValue: Story = {
	args: {
		label: "Textarea with Value",
		onChange: action("changed"),
		placeholder: "Enter your text here...",
		testId: "textarea-with-value",
		value: "This is some existing text that shows how the textarea looks with content.",
	},
};

export const WithError: Story = {
	args: {
		errorMessage: "This field is required and must contain at least 10 characters",
		label: "Textarea with Error",
		onChange: action("changed"),
		placeholder: "Enter your text here...",
		testId: "error-textarea",
	},
};

export const WithCharacterCount: Story = {
	args: {
		countType: "chars",
		label: "Character Count Textarea",
		maxCount: 200,
		onChange: action("changed"),
		placeholder: "Type something... (max 200 characters)",
		showCount: true,
		testId: "char-count-textarea",
	},
};

export const WithWordCount: Story = {
	args: {
		countType: "words",
		label: "Word Count Textarea",
		maxCount: 50,
		onChange: action("changed"),
		placeholder: "Type something... (max 50 words)",
		showCount: true,
		testId: "word-count-textarea",
	},
};

export const FieldVariant: Story = {
	args: {
		label: "Field Variant",
		onChange: action("changed"),
		placeholder: "Field variant with border...",
		testId: "field-variant-textarea",
		variant: "field",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		label: "Disabled Textarea",
		onChange: action("changed"),
		placeholder: "This is disabled...",
		testId: "disabled-textarea",
		value: "This textarea is disabled and cannot be edited.",
	},
};

export const WithoutLabel: Story = {
	args: {
		onChange: action("changed"),
		placeholder: "No label textarea...",
		testId: "no-label-textarea",
	},
};

export const ResizableRows: Story = {
	args: {
		label: "Custom Rows",
		onChange: action("changed"),
		placeholder: "This textarea has 6 rows...",
		rows: 6,
		testId: "custom-rows-textarea",
	},
};

export const LongTextExample: Story = {
	args: {
		countType: "words",
		label: "Research Proposal",
		maxCount: 100,
		onChange: action("changed"),
		placeholder: "Describe your research proposal...",
		rows: 8,
		showCount: true,
		testId: "long-text-textarea",
		value: "Climate change represents one of the most pressing challenges of our time, requiring comprehensive research approaches that integrate multiple disciplines. This proposal outlines a novel methodology for assessing coastal ecosystem resilience through advanced monitoring systems and community-based data collection. Our research will focus on developing sustainable adaptation strategies for vulnerable marine environments while considering socioeconomic factors that influence conservation outcomes.",
	},
};

export const AllVariants: Story = {
	decorators: [
		() => (
			<div className="max-w-md space-y-6 p-8">
				<AppTextArea
					label="Default"
					onChange={action("default-changed")}
					placeholder="Default textarea"
					testId="default"
				/>
				<AppTextArea
					errorMessage="This field has an error"
					label="With Error"
					onChange={action("error-changed")}
					placeholder="Textarea with error"
					testId="with-error"
				/>
				<AppTextArea
					countType="chars"
					label="Character Count"
					maxCount={100}
					onChange={action("char-count-changed")}
					placeholder="Type something..."
					showCount={true}
					testId="char-count"
				/>
				<AppTextArea
					label="Field Variant"
					onChange={action("field-changed")}
					placeholder="Field variant"
					testId="field"
					variant="field"
				/>
				<AppTextArea
					disabled
					label="Disabled"
					onChange={action("disabled-changed")}
					placeholder="Disabled textarea"
					testId="disabled"
					value="This is disabled content"
				/>
			</div>
		),
	],
	parameters: {
		layout: "padded",
	},
};
