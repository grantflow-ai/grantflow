import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Download, Plus, Upload, X } from "lucide-react";
import { action } from "storybook/actions";
import { AppButton } from "./app-button";

const meta: Meta<typeof AppButton> = {
	component: AppButton,
	parameters: {
		layout: "centered",
	},
	title: "Components/AppButton",
};

export default meta;
type Story = StoryObj<typeof AppButton>;

export const Primary: Story = {
	args: {
		children: "Primary Button",
		onClick: action("clicked"),
		variant: "primary",
	},
};

export const Secondary: Story = {
	args: {
		children: "Secondary Button",
		onClick: action("clicked"),
		variant: "secondary",
	},
};

export const Link: Story = {
	args: {
		children: "Link Button",
		onClick: action("clicked"),
		variant: "link",
	},
};

export const WithLeftIcon: Story = {
	args: {
		children: "Upload File",
		leftIcon: <Upload />,
		onClick: action("clicked"),
		variant: "primary",
	},
};

export const WithRightIcon: Story = {
	args: {
		children: "Download",
		onClick: action("clicked"),
		rightIcon: <Download />,
		variant: "secondary",
	},
};

export const WithBothIcons: Story = {
	args: {
		children: "Add Item",
		leftIcon: <Plus />,
		onClick: action("clicked"),
		rightIcon: <X />,
		variant: "primary",
	},
};

export const SmallSize: Story = {
	args: {
		children: "Small",
		onClick: action("clicked"),
		size: "sm",
		variant: "primary",
	},
};

export const MediumSize: Story = {
	args: {
		children: "Medium",
		onClick: action("clicked"),
		size: "md",
		variant: "primary",
	},
};

export const LargeSize: Story = {
	args: {
		children: "Large",
		onClick: action("clicked"),
		size: "lg",
		variant: "primary",
	},
};

export const LightTheme: Story = {
	args: {
		children: "Light Theme",
		onClick: action("clicked"),
		theme: "light",
		variant: "secondary",
	},
	decorators: [
		(Story) => (
			<div className="bg-gray-800 p-8">
				<Story />
			</div>
		),
	],
};

export const LightThemeLink: Story = {
	args: {
		children: "Light Link",
		onClick: action("clicked"),
		theme: "light",
		variant: "link",
	},
	decorators: [
		(Story) => (
			<div className="bg-gray-800 p-8">
				<Story />
			</div>
		),
	],
};

export const Disabled: Story = {
	args: {
		children: "Disabled Button",
		disabled: true,
		onClick: action("clicked"),
		variant: "primary",
	},
};

export const DisabledSecondary: Story = {
	args: {
		children: "Disabled Secondary",
		disabled: true,
		onClick: action("clicked"),
		variant: "secondary",
	},
};

export const AllVariants: Story = {
	decorators: [
		() => (
			<div className="space-y-4">
				<div className="space-x-4">
					<AppButton onClick={action("primary-clicked")} variant="primary">
						Primary
					</AppButton>
					<AppButton onClick={action("secondary-clicked")} variant="secondary">
						Secondary
					</AppButton>
					<AppButton onClick={action("link-clicked")} variant="link">
						Link
					</AppButton>
				</div>
				<div className="space-x-4">
					<AppButton leftIcon={<Upload />} onClick={action("icon-clicked")} variant="primary">
						With Icon
					</AppButton>
					<AppButton disabled onClick={action("disabled-clicked")} variant="primary">
						Disabled
					</AppButton>
				</div>
				<div className="space-x-4 bg-gray-800 p-4">
					<AppButton onClick={action("light-clicked")} theme="light" variant="secondary">
						Light Theme
					</AppButton>
					<AppButton onClick={action("light-link-clicked")} theme="light" variant="link">
						Light Link
					</AppButton>
				</div>
			</div>
		),
	],
	parameters: {
		layout: "padded",
	},
};
