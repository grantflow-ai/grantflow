import type { Meta, StoryObj } from "@storybook/react-vite";
import { Download, Edit, Heart, Mail, Phone, Plus, Search, Settings, Star, Trash2, Upload, X } from "lucide-react";
import { action } from "storybook/actions";
import { IconButton } from "./icon-button";

const meta: Meta<typeof IconButton> = {
	argTypes: {
		children: {
			control: "text",
			name: "text",
		},
		onClick: {
			action: false,
		},
	},
	component: IconButton,
	parameters: {
		actions: {
			disable: true,
		},
		controls: {
			include: ["children", "variant", "size"],
		},
		layout: "centered",
	},
	title: "Components/Buttons/IconButton",
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const SolidButtonDefault: Story = {
	args: {
		children: <Plus className="size-4" />,
		onClick: action("clicked"),
		size: "md",
		variant: "solid",
	},
	name: "Solid Button - Default",
};

export const SolidButtonWithIcons: Story = {
	name: "Solid Button - With Icons",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
			<div className="text-sm font-medium text-gray-600 mb-2">Solid Button Icon Variants</div>
			<div className="flex flex-wrap gap-3 items-start">
				<IconButton onClick={action("clicked")} variant="solid">
					<Plus className="size-4" />
				</IconButton>
				<IconButton onClick={action("clicked")} variant="solid">
					<Download className="size-4" />
				</IconButton>
				<IconButton onClick={action("clicked")} variant="solid">
					<Upload className="size-4" />
				</IconButton>
				<IconButton onClick={action("clicked")} variant="solid">
					<Edit className="size-4" />
				</IconButton>
				<IconButton onClick={action("clicked")} variant="solid">
					<Trash2 className="size-4" />
				</IconButton>
				<IconButton onClick={action("clicked")} variant="solid">
					<Settings className="size-4" />
				</IconButton>
			</div>
		</div>
	),
};

export const SolidButtonDisabled: Story = {
	name: "Solid Button - Disabled",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-black rounded-lg">
			<div className="text-sm font-medium text-gray-300 mb-2">Disabled Solid States</div>
			<div className="flex flex-wrap gap-3 items-start">
				<IconButton disabled onClick={action("clicked")} variant="solid">
					<Plus className="size-4" />
				</IconButton>
				<IconButton disabled onClick={action("clicked")} variant="solid">
					<Download className="size-4" />
				</IconButton>
				<IconButton disabled onClick={action("clicked")} variant="solid">
					<Edit className="size-4" />
				</IconButton>
				<IconButton disabled onClick={action("clicked")} variant="solid">
					<Trash2 className="size-4" />
				</IconButton>
			</div>
		</div>
	),
};

export const SolidButtonLarge: Story = {
	args: {
		children: <Plus className="size-5" />,
		onClick: action("clicked"),
		size: "lg",
		variant: "solid",
	},
	name: "Solid Button - Large-sized",
};

export const SolidButtonLargeWithIcons: Story = {
	name: "Solid Button - Large-sized with Icons",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg">
			<div className="text-sm font-medium text-gray-700 mb-2">Large Solid Buttons</div>
			<div className="flex flex-wrap gap-3 items-start">
				<IconButton onClick={action("clicked")} size="lg" variant="solid">
					<Search className="size-5" />
				</IconButton>
				<IconButton onClick={action("clicked")} size="lg" variant="solid">
					<Heart className="size-5" />
				</IconButton>
				<IconButton onClick={action("clicked")} size="lg" variant="solid">
					<Star className="size-5" />
				</IconButton>
				<IconButton onClick={action("clicked")} size="lg" variant="solid">
					<Mail className="size-5" />
				</IconButton>
				<IconButton onClick={action("clicked")} size="lg" variant="solid">
					<Phone className="size-5" />
				</IconButton>
			</div>
		</div>
	),
};

export const SolidButtonSmall: Story = {
	args: {
		children: <Plus className="size-3" />,
		onClick: action("clicked"),
		size: "sm",
		variant: "solid",
	},
	name: "Solid Button - Small-sized",
};

export const SolidButtonSmallWithIcons: Story = {
	name: "Solid Button - Small-sized with Icons",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
			<div className="text-sm font-medium text-gray-700 mb-2">Small Solid Buttons</div>
			<div className="flex flex-wrap gap-3 items-start">
				<IconButton onClick={action("clicked")} size="sm" variant="solid">
					<Plus className="size-3" />
				</IconButton>
				<IconButton onClick={action("clicked")} size="sm" variant="solid">
					<X className="size-3" />
				</IconButton>
				<IconButton onClick={action("clicked")} size="sm" variant="solid">
					<Edit className="size-3" />
				</IconButton>
				<IconButton onClick={action("clicked")} size="sm" variant="solid">
					<Trash2 className="size-3" />
				</IconButton>
				<IconButton onClick={action("clicked")} size="sm" variant="solid">
					<Settings className="size-3" />
				</IconButton>
			</div>
		</div>
	),
};

export const SolidButtonDisabledLarge: Story = {
	args: {
		children: <Plus className="size-5" />,
		disabled: true,
		onClick: action("clicked"),
		size: "lg",
		variant: "solid",
	},
	name: "Solid Button - Disabled (Large-sized)",
};

export const SolidButtonDisabledSmall: Story = {
	args: {
		children: <Plus className="size-3" />,
		disabled: true,
		onClick: action("clicked"),
		size: "sm",
		variant: "solid",
	},
	name: "Solid Button - Disabled (Small-sized)",
};

export const FloatButtonDefault: Story = {
	args: {
		children: <Plus className="size-4" />,
		onClick: action("clicked"),
		size: "md",
		variant: "float",
	},
	name: "Float Button - Default",
};

export const FloatButtonWithIcons: Story = {
	name: "Float Button - With Icons",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-slate-50 to-zinc-100 rounded-lg">
			<div className="text-sm font-medium text-gray-600 mb-2">Float Button Icon Variants</div>
			<div className="flex flex-wrap gap-3 items-start">
				<IconButton onClick={action("clicked")} variant="float">
					<Plus className="size-4" />
				</IconButton>
				<IconButton onClick={action("clicked")} variant="float">
					<Download className="size-4" />
				</IconButton>
				<IconButton onClick={action("clicked")} variant="float">
					<Upload className="size-4" />
				</IconButton>
				<IconButton onClick={action("clicked")} variant="float">
					<Edit className="size-4" />
				</IconButton>
				<IconButton onClick={action("clicked")} variant="float">
					<Trash2 className="size-4" />
				</IconButton>
				<IconButton onClick={action("clicked")} variant="float">
					<Settings className="size-4" />
				</IconButton>
			</div>
		</div>
	),
};

export const FloatButtonDisabled: Story = {
	name: "Float Button - Disabled",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-black rounded-lg">
			<div className="text-sm font-medium text-gray-300 mb-2">Disabled Float States</div>
			<div className="flex flex-wrap gap-3 items-start">
				<IconButton disabled onClick={action("clicked")} variant="float">
					<Plus className="size-4" />
				</IconButton>
				<IconButton disabled onClick={action("clicked")} variant="float">
					<Download className="size-4" />
				</IconButton>
				<IconButton disabled onClick={action("clicked")} variant="float">
					<Edit className="size-4" />
				</IconButton>
				<IconButton disabled onClick={action("clicked")} variant="float">
					<Trash2 className="size-4" />
				</IconButton>
			</div>
		</div>
	),
};

export const FloatButtonLarge: Story = {
	args: {
		children: <Plus className="size-5" />,
		onClick: action("clicked"),
		size: "lg",
		variant: "float",
	},
	name: "Float Button - Large-sized",
};

export const FloatButtonLargeWithIcons: Story = {
	name: "Float Button - Large-sized with Icons",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg">
			<div className="text-sm font-medium text-gray-700 mb-2">Large Float Buttons</div>
			<div className="flex flex-wrap gap-3 items-start">
				<IconButton onClick={action("clicked")} size="lg" variant="float">
					<Search className="size-5" />
				</IconButton>
				<IconButton onClick={action("clicked")} size="lg" variant="float">
					<Heart className="size-5" />
				</IconButton>
				<IconButton onClick={action("clicked")} size="lg" variant="float">
					<Star className="size-5" />
				</IconButton>
				<IconButton onClick={action("clicked")} size="lg" variant="float">
					<Mail className="size-5" />
				</IconButton>
				<IconButton onClick={action("clicked")} size="lg" variant="float">
					<Phone className="size-5" />
				</IconButton>
			</div>
		</div>
	),
};

export const FloatButtonSmall: Story = {
	args: {
		children: <Plus className="size-3" />,
		onClick: action("clicked"),
		size: "sm",
		variant: "float",
	},
	name: "Float Button - Small-sized",
};

export const FloatButtonSmallWithIcons: Story = {
	name: "Float Button - Small-sized with Icons",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg">
			<div className="text-sm font-medium text-gray-700 mb-2">Small Float Buttons</div>
			<div className="flex flex-wrap gap-3 items-start">
				<IconButton onClick={action("clicked")} size="sm" variant="float">
					<Plus className="size-3" />
				</IconButton>
				<IconButton onClick={action("clicked")} size="sm" variant="float">
					<X className="size-3" />
				</IconButton>
				<IconButton onClick={action("clicked")} size="sm" variant="float">
					<Edit className="size-3" />
				</IconButton>
				<IconButton onClick={action("clicked")} size="sm" variant="float">
					<Trash2 className="size-3" />
				</IconButton>
				<IconButton onClick={action("clicked")} size="sm" variant="float">
					<Settings className="size-3" />
				</IconButton>
			</div>
		</div>
	),
};

export const FloatButtonDisabledLarge: Story = {
	args: {
		children: <Plus className="size-5" />,
		disabled: true,
		onClick: action("clicked"),
		size: "lg",
		variant: "float",
	},
	decorators: [
		(Story) => (
			<div className="bg-black p-8 rounded-lg">
				<Story />
			</div>
		),
	],
	name: "Float Button - Disabled (Large-sized)",
};

export const FloatButtonDisabledSmall: Story = {
	args: {
		children: <Plus className="size-3" />,
		disabled: true,
		onClick: action("clicked"),
		size: "sm",
		variant: "float",
	},
	decorators: [
		(Story) => (
			<div className="bg-black p-8 rounded-lg">
				<Story />
			</div>
		),
	],
	name: "Float Button - Disabled (Small-sized)",
};

export const AllVariants: Story = {
	parameters: {
		layout: "fullscreen",
	},
	render: () => (
		<div className="space-y-12 p-8 max-w-7xl mx-auto">
			<div className="space-y-6">
				<h2 className="text-2xl font-bold text-gray-800">Solid Buttons</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="p-4 bg-gray-50 rounded-lg">
						<h3 className="text-sm font-medium text-gray-600 mb-3">Default (Medium)</h3>
						<IconButton onClick={action("clicked")} variant="solid">
							<Plus className="size-4" />
						</IconButton>
					</div>
					<div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
						<h3 className="text-sm font-medium text-gray-600 mb-3">With Icons</h3>
						<div className="flex flex-wrap gap-3 items-start">
							<IconButton onClick={action("clicked")} variant="solid">
								<Plus className="size-4" />
							</IconButton>
							<IconButton onClick={action("clicked")} variant="solid">
								<Download className="size-4" />
							</IconButton>
							<IconButton onClick={action("clicked")} variant="solid">
								<Edit className="size-4" />
							</IconButton>
							<IconButton onClick={action("clicked")} variant="solid">
								<Trash2 className="size-4" />
							</IconButton>
							<IconButton onClick={action("clicked")} variant="solid">
								<Settings className="size-4" />
							</IconButton>
						</div>
					</div>
					<div className="p-4 bg-black rounded-lg">
						<h3 className="text-sm font-medium text-gray-300 mb-3">Disabled States</h3>
						<div className="flex flex-wrap gap-3 items-start">
							<IconButton disabled onClick={action("clicked")} variant="solid">
								<Plus className="size-4" />
							</IconButton>
							<IconButton disabled onClick={action("clicked")} variant="solid">
								<Download className="size-4" />
							</IconButton>
							<IconButton disabled onClick={action("clicked")} variant="solid">
								<Edit className="size-4" />
							</IconButton>
						</div>
					</div>
					<div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
						<h3 className="text-sm font-medium text-gray-600 mb-3">Size Variations</h3>
						<div className="flex flex-wrap gap-3 items-start">
							<IconButton onClick={action("clicked")} size="lg" variant="solid">
								<Plus className="size-5" />
							</IconButton>
							<IconButton onClick={action("clicked")} size="md" variant="solid">
								<Plus className="size-4" />
							</IconButton>
							<IconButton onClick={action("clicked")} size="sm" variant="solid">
								<Plus className="size-3" />
							</IconButton>
						</div>
					</div>
				</div>
			</div>

			<div className="space-y-6">
				<h2 className="text-2xl font-bold text-gray-800">Float Buttons</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="p-4 bg-slate-50 rounded-lg">
						<h3 className="text-sm font-medium text-gray-600 mb-3">Default (Medium)</h3>
						<IconButton onClick={action("clicked")} variant="float">
							<Plus className="size-4" />
						</IconButton>
					</div>
					<div className="p-4 bg-gradient-to-br from-slate-50 to-zinc-100 rounded-lg">
						<h3 className="text-sm font-medium text-gray-600 mb-3">With Icons</h3>
						<div className="flex flex-wrap gap-3 items-start">
							<IconButton onClick={action("clicked")} variant="float">
								<Plus className="size-4" />
							</IconButton>
							<IconButton onClick={action("clicked")} variant="float">
								<Download className="size-4" />
							</IconButton>
							<IconButton onClick={action("clicked")} variant="float">
								<Edit className="size-4" />
							</IconButton>
							<IconButton onClick={action("clicked")} variant="float">
								<Trash2 className="size-4" />
							</IconButton>
							<IconButton onClick={action("clicked")} variant="float">
								<Settings className="size-4" />
							</IconButton>
						</div>
					</div>
					<div className="p-4 bg-black rounded-lg">
						<h3 className="text-sm font-medium text-gray-300 mb-3">Disabled States</h3>
						<div className="flex flex-wrap gap-3 items-start">
							<IconButton disabled onClick={action("clicked")} variant="float">
								<Plus className="size-4" />
							</IconButton>
							<IconButton disabled onClick={action("clicked")} variant="float">
								<Download className="size-4" />
							</IconButton>
							<IconButton disabled onClick={action("clicked")} variant="float">
								<Edit className="size-4" />
							</IconButton>
						</div>
					</div>
					<div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
						<h3 className="text-sm font-medium text-gray-600 mb-3">Size Variations</h3>
						<div className="flex flex-wrap gap-3 items-start">
							<IconButton onClick={action("clicked")} size="lg" variant="float">
								<Plus className="size-5" />
							</IconButton>
							<IconButton onClick={action("clicked")} size="md" variant="float">
								<Plus className="size-4" />
							</IconButton>
							<IconButton onClick={action("clicked")} size="sm" variant="float">
								<Plus className="size-3" />
							</IconButton>
						</div>
					</div>
				</div>
			</div>
		</div>
	),
};
