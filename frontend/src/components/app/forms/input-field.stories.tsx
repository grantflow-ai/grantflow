import type { Meta, StoryObj } from "@storybook/react-vite";
import Image from "next/image";
import { action } from "storybook/actions";
import AppInput from "./input-field";

const meta: Meta<typeof AppInput> = {
	component: AppInput,
	decorators: [
		(Story) => (
			<div className="max-w-md p-8">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "centered",
	},
	title: "Components/InputField",
};

export default meta;
type Story = StoryObj<typeof AppInput>;

export const Default: Story = {
	args: {
		label: "Default Input",
		onChange: action("changed"),
		placeholder: "Enter text here...",
		testId: "default-input",
	},
};

export const WithValue: Story = {
	args: {
		label: "Input with Value",
		onChange: action("changed"),
		placeholder: "Enter text here...",
		testId: "input-with-value",
		value: "This is some text",
	},
};

export const WithIcon: Story = {
	args: {
		icon: <Image alt="Search" height={16} src="/icons/plus.svg" width={16} />,
		label: "Search Input",
		onChange: action("changed"),
		placeholder: "Search...",
		testId: "search-input",
	},
};

export const WithError: Story = {
	args: {
		errorMessage: "This field is required",
		label: "Input with Error",
		onChange: action("changed"),
		placeholder: "Enter text here...",
		testId: "error-input",
	},
};

export const WithCharacterCount: Story = {
	args: {
		countType: "chars",
		label: "Character Count",
		maxCount: 50,
		onChange: action("changed"),
		placeholder: "Type something...",
		showCount: true,
		testId: "char-count-input",
	},
};

export const WithWordCount: Story = {
	args: {
		countType: "words",
		label: "Word Count",
		maxCount: 10,
		onChange: action("changed"),
		placeholder: "Type something...",
		showCount: true,
		testId: "word-count-input",
	},
};

export const FieldVariant: Story = {
	args: {
		label: "Field Variant",
		onChange: action("changed"),
		placeholder: "Field variant with border...",
		testId: "field-variant",
		variant: "field",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		label: "Disabled Input",
		onChange: action("changed"),
		placeholder: "This is disabled...",
		testId: "disabled-input",
		value: "Disabled value",
	},
};

export const WithoutLabel: Story = {
	args: {
		onChange: action("changed"),
		placeholder: "No label input...",
		testId: "no-label-input",
	},
};

export const EmailInput: Story = {
	args: {
		icon: <Image alt="Email" height={16} src="/icons/plus.svg" width={16} />,
		label: "Email Address",
		onChange: action("changed"),
		placeholder: "your@email.com",
		testId: "email-input",
		type: "email",
	},
};

export const PasswordInput: Story = {
	args: {
		icon: <Image alt="Password" height={16} src="/icons/close.svg" width={16} />,
		label: "Password",
		onChange: action("changed"),
		placeholder: "Enter your password",
		testId: "password-input",
		type: "password",
	},
};

export const UrlInput: Story = {
	args: {
		icon: <Image alt="URL" height={16} src="/icons/globe.svg" width={16} />,
		label: "Website URL",
		onChange: action("changed"),
		placeholder: "https://example.com",
		testId: "url-input",
		type: "url",
	},
};

export const NumberInput: Story = {
	args: {
		label: "Age",
		onChange: action("changed"),
		placeholder: "Enter your age",
		testId: "number-input",
		type: "number",
	},
};

export const AllVariants: Story = {
	decorators: [
		() => (
			<div className="max-w-md space-y-6 p-8">
				<AppInput
					label="Default"
					onChange={action("default-changed")}
					placeholder="Default input"
					testId="default"
				/>
				<AppInput
					icon={<Image alt="User" height={16} src="/icons/dashboard.svg" width={16} />}
					label="With Icon"
					onChange={action("icon-changed")}
					placeholder="Input with icon"
					testId="with-icon"
				/>
				<AppInput
					errorMessage="This field has an error"
					label="With Error"
					onChange={action("error-changed")}
					placeholder="Input with error"
					testId="with-error"
				/>
				<AppInput
					countType="chars"
					label="Character Count"
					maxCount={50}
					onChange={action("char-count-changed")}
					placeholder="Type something..."
					showCount={true}
					testId="char-count"
				/>
				<AppInput
					label="Field Variant"
					onChange={action("field-changed")}
					placeholder="Field variant"
					testId="field"
					variant="field"
				/>
				<AppInput
					disabled
					label="Disabled"
					onChange={action("disabled-changed")}
					placeholder="Disabled input"
					testId="disabled"
					value="Disabled value"
				/>
			</div>
		),
	],
	parameters: {
		layout: "padded",
	},
};
