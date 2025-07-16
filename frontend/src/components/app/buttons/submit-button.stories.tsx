import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, Check, Send } from "lucide-react";
import { action } from "storybook/actions";
import { SubmitButton } from "./submit-button";

const meta: Meta<typeof SubmitButton> = {
	component: SubmitButton,
	parameters: {
		layout: "centered",
	},
	title: "Components/Buttons/SubmitButton",
};

export default meta;
type Story = StoryObj<typeof SubmitButton>;

export const Default: Story = {
	args: {
		children: "Submit",
	},
};

export const Loading: Story = {
	args: {
		children: "Submitting...",
		isLoading: true,
	},
};

export const WithRightIcon: Story = {
	args: {
		children: "Submit",
		rightIcon: <ArrowRight className="size-4" />,
	},
};

export const LoadingWithIcon: Story = {
	args: {
		children: "Processing",
		isLoading: true,
		rightIcon: <Send className="size-4" />,
	},
	name: "Loading (Icon Replaced)",
};

export const Disabled: Story = {
	args: {
		children: "Submit",
		disabled: true,
	},
};

export const DisabledLoading: Story = {
	args: {
		children: "Processing",
		disabled: true,
		isLoading: true,
	},
};

export const PrimaryVariant: Story = {
	args: {
		children: "Submit Application",
		variant: "primary",
	},
};

export const SecondaryVariant: Story = {
	args: {
		children: "Save Draft",
		variant: "secondary",
	},
};

export const LinkVariant: Story = {
	args: {
		children: "Skip for Now",
		variant: "link",
	},
};

export const DarkTheme: Story = {
	args: {
		children: "Submit",
		theme: "dark",
	},
};

export const LightTheme: Story = {
	args: {
		children: "Submit",
		theme: "light",
	},
};

export const SmallSize: Story = {
	args: {
		children: "Submit",
		size: "sm",
	},
};

export const MediumSize: Story = {
	args: {
		children: "Submit",
		size: "md",
	},
};

export const LargeSize: Story = {
	args: {
		children: "Submit",
		size: "lg",
	},
};

export const LongText: Story = {
	args: {
		children: "Submit Grant Application for Review",
	},
};

export const WithCustomIcon: Story = {
	args: {
		children: "Complete",
		rightIcon: <Check className="size-4" />,
	},
};

export const FormExample: Story = {
	name: "In Form Context",
	render: () => (
		<form
			className="w-80 space-y-4"
			onSubmit={(e) => {
				e.preventDefault();
				action("form-submitted")();
			}}
		>
			<div className="space-y-2">
				<label className="text-sm font-medium" htmlFor="email">
					Email
				</label>
				<input
					className="w-full rounded-md border px-3 py-2"
					id="email"
					placeholder="Enter your email"
					required
					type="email"
				/>
			</div>
			<div className="space-y-2">
				<label className="text-sm font-medium" htmlFor="message">
					Message
				</label>
				<textarea
					className="w-full rounded-md border px-3 py-2"
					id="message"
					placeholder="Enter your message"
					required
					rows={3}
				/>
			</div>
			<SubmitButton>Submit Form</SubmitButton>
		</form>
	),
};

export const LoadingStates: Story = {
	name: "Loading State Comparison",
	render: () => (
		<div className="space-y-4">
			<div className="space-y-2">
				<p className="text-muted-foreground text-sm">Default state:</p>
				<SubmitButton>Submit Application</SubmitButton>
			</div>
			<div className="space-y-2">
				<p className="text-muted-foreground text-sm">Loading state:</p>
				<SubmitButton isLoading>Submitting...</SubmitButton>
			</div>
			<div className="space-y-2">
				<p className="text-muted-foreground text-sm">Loading with custom icon (replaced):</p>
				<SubmitButton isLoading rightIcon={<Send className="size-4" />}>
					Sending...
				</SubmitButton>
			</div>
		</div>
	),
};

export const VariantShowcase: Story = {
	name: "All Variants",
	render: () => (
		<div className="space-y-4">
			<SubmitButton variant="primary">Primary Submit</SubmitButton>
			<SubmitButton variant="secondary">Secondary Submit</SubmitButton>
			<SubmitButton variant="link">Link Submit</SubmitButton>
			<SubmitButton isLoading variant="primary">
				Loading Primary
			</SubmitButton>
			<SubmitButton isLoading variant="secondary">
				Loading Secondary
			</SubmitButton>
			<SubmitButton isLoading variant="link">
				Loading Link
			</SubmitButton>
		</div>
	),
};

export const SizeComparison: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<SubmitButton size="sm">Small</SubmitButton>
			<SubmitButton size="md">Medium</SubmitButton>
			<SubmitButton size="lg">Large</SubmitButton>
		</div>
	),
};
