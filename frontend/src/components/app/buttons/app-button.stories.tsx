import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, ChevronRight, Download, ExternalLink, FileText, Plus, Save, Send, Upload, X } from "lucide-react";
import { action } from "storybook/actions";
import { AppButton } from "./app-button";

const meta: Meta<typeof AppButton> = {
	argTypes: {
		children: {
			control: "text",
			name: "text",
		},
		onClick: {
			action: false,
		},
	},
	component: AppButton,
	parameters: {
		actions: {
			disable: true,
		},
		controls: {
			include: ["children", "variant", "size"],
		},
		layout: "centered",
	},
	title: "Components/Buttons/AppButton",
};

export default meta;
type Story = StoryObj<typeof AppButton>;

export const PrimaryButtonDefault: Story = {
	args: {
		children: "Primary Button",
		onClick: action("clicked"),
		size: "md",
		variant: "primary",
	},
	name: "Primary Button - Default",
};

export const PrimaryButtonWithIcons: Story = {
	name: "Primary Button - With Icons",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
			<div className="text-sm font-medium text-gray-600 mb-2">Primary Button Icon Variants</div>
			<AppButton leftIcon={<Upload />} onClick={action("clicked")} variant="primary">
				Upload File
			</AppButton>
			<AppButton onClick={action("clicked")} rightIcon={<ChevronRight />} variant="primary">
				Continue
			</AppButton>
			<AppButton leftIcon={<Plus />} onClick={action("clicked")} rightIcon={<ArrowRight />} variant="primary">
				Add Item
			</AppButton>
		</div>
	),
};

export const PrimaryButtonDisabled: Story = {
	name: "Primary Button - Disabled",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-black rounded-lg">
			<div className="text-sm font-medium text-gray-300 mb-2">Disabled States</div>
			<AppButton disabled onClick={action("clicked")} variant="primary">
				Disabled
			</AppButton>
			<AppButton disabled leftIcon={<Upload />} onClick={action("clicked")} variant="primary">
				Disabled with Left Icon
			</AppButton>
			<AppButton disabled onClick={action("clicked")} rightIcon={<ChevronRight />} variant="primary">
				Disabled with Right Icon
			</AppButton>
			<AppButton
				disabled
				leftIcon={<Plus />}
				onClick={action("clicked")}
				rightIcon={<ArrowRight />}
				variant="primary"
			>
				Disabled with Both Icons
			</AppButton>
		</div>
	),
};

export const PrimaryButtonLarge: Story = {
	args: {
		children: "Large Primary Button",
		onClick: action("clicked"),
		size: "lg",
		variant: "primary",
	},
	name: "Primary Button - Large-sized",
};

export const PrimaryButtonLargeWithIcons: Story = {
	name: "Primary Button - Large-sized with Icons",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg">
			<div className="text-sm font-medium text-gray-700 mb-2">Large Primary Buttons</div>
			<AppButton leftIcon={<FileText />} onClick={action("clicked")} size="lg" variant="primary">
				View Document
			</AppButton>
			<AppButton onClick={action("clicked")} rightIcon={<Send />} size="lg" variant="primary">
				Submit Application
			</AppButton>
			<AppButton
				leftIcon={<Save />}
				onClick={action("clicked")}
				rightIcon={<ChevronRight />}
				size="lg"
				variant="primary"
			>
				Save and Continue
			</AppButton>
		</div>
	),
};

export const PrimaryButtonSmall: Story = {
	args: {
		children: "Small Button",
		onClick: action("clicked"),
		size: "sm",
		variant: "primary",
	},
	name: "Primary Button - Small-sized",
};

export const PrimaryButtonSmallWithIcons: Story = {
	name: "Primary Button - Small-sized with Icons",
	render: () => (
		<div className="flex flex-col gap-3 p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
			<div className="text-sm font-medium text-gray-700 mb-2">Small Primary Buttons</div>
			<AppButton leftIcon={<Plus />} onClick={action("clicked")} size="sm" variant="primary">
				Add
			</AppButton>
			<AppButton onClick={action("clicked")} rightIcon={<X />} size="sm" variant="primary">
				Remove
			</AppButton>
			<AppButton
				leftIcon={<Upload />}
				onClick={action("clicked")}
				rightIcon={<ArrowRight />}
				size="sm"
				variant="primary"
			>
				Quick Upload
			</AppButton>
		</div>
	),
};

export const PrimaryButtonDisabledLarge: Story = {
	args: {
		children: "Disabled Large Button",
		disabled: true,
		onClick: action("clicked"),
		size: "lg",
		variant: "primary",
	},
	name: "Primary Button - Disabled (Large-sized)",
};

export const PrimaryButtonDisabledSmall: Story = {
	args: {
		children: "Disabled Small",
		disabled: true,
		onClick: action("clicked"),
		size: "sm",
		variant: "primary",
	},
	name: "Primary Button - Disabled (Small-sized)",
};

export const SecondaryButtonDefault: Story = {
	args: {
		children: "Secondary Button",
		onClick: action("clicked"),
		size: "md",
		variant: "secondary",
	},
	name: "Secondary Button - Default",
};

export const SecondaryButtonWithIcons: Story = {
	name: "Secondary Button - With Icons",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-slate-50 to-zinc-100 rounded-lg">
			<div className="text-sm font-medium text-gray-600 mb-2">Secondary Button Icon Variants</div>
			<AppButton leftIcon={<Download />} onClick={action("clicked")} variant="secondary">
				Download
			</AppButton>
			<AppButton onClick={action("clicked")} rightIcon={<ExternalLink />} variant="secondary">
				Open Link
			</AppButton>
			<AppButton leftIcon={<FileText />} onClick={action("clicked")} rightIcon={<Download />} variant="secondary">
				Export Report
			</AppButton>
		</div>
	),
};

export const SecondaryButtonDisabled: Story = {
	name: "Secondary Button - Disabled",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-black rounded-lg">
			<div className="text-sm font-medium text-gray-300 mb-2">Disabled Secondary States</div>
			<AppButton disabled onClick={action("clicked")} variant="secondary">
				Disabled
			</AppButton>
			<AppButton disabled leftIcon={<Download />} onClick={action("clicked")} variant="secondary">
				Disabled with Left Icon
			</AppButton>
			<AppButton disabled onClick={action("clicked")} rightIcon={<ExternalLink />} variant="secondary">
				Disabled with Right Icon
			</AppButton>
			<AppButton
				disabled
				leftIcon={<FileText />}
				onClick={action("clicked")}
				rightIcon={<Download />}
				variant="secondary"
			>
				Disabled with Both Icons
			</AppButton>
		</div>
	),
};

export const SecondaryButtonLarge: Story = {
	args: {
		children: "Large Secondary Button",
		onClick: action("clicked"),
		size: "lg",
		variant: "secondary",
	},
	name: "Secondary Button - Large-sized",
};

export const SecondaryButtonLargeWithIcons: Story = {
	name: "Secondary Button - Large-sized with Icons",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg">
			<div className="text-sm font-medium text-gray-700 mb-2">Large Secondary Buttons</div>
			<AppButton leftIcon={<FileText />} onClick={action("clicked")} size="lg" variant="secondary">
				View Details
			</AppButton>
			<AppButton onClick={action("clicked")} rightIcon={<Download />} size="lg" variant="secondary">
				Export Data
			</AppButton>
			<AppButton
				leftIcon={<Save />}
				onClick={action("clicked")}
				rightIcon={<ExternalLink />}
				size="lg"
				variant="secondary"
			>
				Save and Share
			</AppButton>
		</div>
	),
};

export const SecondaryButtonSmall: Story = {
	args: {
		children: "Small Secondary",
		onClick: action("clicked"),
		size: "sm",
		variant: "secondary",
	},
	name: "Secondary Button - Small-sized",
};

export const SecondaryButtonSmallWithIcons: Story = {
	name: "Secondary Button - Small-sized with Icons",
	render: () => (
		<div className="flex flex-col gap-3 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg">
			<div className="text-sm font-medium text-gray-700 mb-2">Small Secondary Buttons</div>
			<AppButton leftIcon={<Plus />} onClick={action("clicked")} size="sm" variant="secondary">
				Add
			</AppButton>
			<AppButton onClick={action("clicked")} rightIcon={<X />} size="sm" variant="secondary">
				Cancel
			</AppButton>
			<AppButton
				leftIcon={<Save />}
				onClick={action("clicked")}
				rightIcon={<ArrowRight />}
				size="sm"
				variant="secondary"
			>
				Quick Save
			</AppButton>
		</div>
	),
};

export const SecondaryButtonDisabledLarge: Story = {
	args: {
		children: "Disabled Large Secondary",
		disabled: true,
		onClick: action("clicked"),
		size: "lg",
		variant: "secondary",
	},
	name: "Secondary Button - Disabled (Large-sized)",
};

export const SecondaryButtonDisabledSmall: Story = {
	args: {
		children: "Disabled Small",
		disabled: true,
		onClick: action("clicked"),
		size: "sm",
		variant: "secondary",
	},
	name: "Secondary Button - Disabled (Small-sized)",
};

export const LinkButtonDefault: Story = {
	args: {
		children: "Link Button",
		onClick: action("clicked"),
		size: "md",
		variant: "link",
	},
	name: "Link Button - Default",
};

export const LinkButtonWithIcons: Story = {
	name: "Link Button - With Icons",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-indigo-50 to-blue-100 rounded-lg">
			<div className="text-sm font-medium text-gray-600 mb-2">Link Button Icon Variants</div>
			<AppButton leftIcon={<ExternalLink />} onClick={action("clicked")} variant="link">
				External Link
			</AppButton>
			<AppButton onClick={action("clicked")} rightIcon={<ChevronRight />} variant="link">
				Learn More
			</AppButton>
			<AppButton leftIcon={<FileText />} onClick={action("clicked")} rightIcon={<ExternalLink />} variant="link">
				View Documentation
			</AppButton>
		</div>
	),
};

export const LinkButtonDisabled: Story = {
	name: "Link Button - Disabled",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-blue-200 to-indigo-300 rounded-lg">
			<div className="text-sm font-medium text-gray-700 mb-2">Disabled Link States</div>
			<AppButton disabled onClick={action("clicked")} variant="link">
				Disabled Link
			</AppButton>
			<AppButton disabled leftIcon={<ExternalLink />} onClick={action("clicked")} variant="link">
				Disabled with Left Icon
			</AppButton>
			<AppButton disabled onClick={action("clicked")} rightIcon={<ChevronRight />} variant="link">
				Disabled with Right Icon
			</AppButton>
			<AppButton
				disabled
				leftIcon={<FileText />}
				onClick={action("clicked")}
				rightIcon={<ExternalLink />}
				variant="link"
			>
				Disabled with Both Icons
			</AppButton>
		</div>
	),
};

export const LinkButtonLarge: Story = {
	args: {
		children: "Large Link Button",
		onClick: action("clicked"),
		size: "lg",
		variant: "link",
	},
	name: "Link Button - Large-sized",
};

export const LinkButtonLargeWithIcons: Story = {
	name: "Link Button - Large-sized with Icons",
	render: () => (
		<div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-cyan-50 to-teal-100 rounded-lg">
			<div className="text-sm font-medium text-gray-700 mb-2">Large Link Buttons</div>
			<AppButton leftIcon={<FileText />} onClick={action("clicked")} size="lg" variant="link">
				Read More
			</AppButton>
			<AppButton onClick={action("clicked")} rightIcon={<ExternalLink />} size="lg" variant="link">
				Visit Website
			</AppButton>
			<AppButton
				leftIcon={<Download />}
				onClick={action("clicked")}
				rightIcon={<ChevronRight />}
				size="lg"
				variant="link"
			>
				Download Guide
			</AppButton>
		</div>
	),
};

export const LinkButtonSmall: Story = {
	args: {
		children: "Small Link",
		onClick: action("clicked"),
		size: "sm",
		variant: "link",
	},
	name: "Link Button - Small-sized",
};

export const LinkButtonSmallWithIcons: Story = {
	name: "Link Button - Small-sized with Icons",
	render: () => (
		<div className="flex flex-col gap-3 p-6 bg-gradient-to-br from-rose-50 to-pink-100 rounded-lg">
			<div className="text-sm font-medium text-gray-700 mb-2">Small Link Buttons</div>
			<AppButton leftIcon={<Plus />} onClick={action("clicked")} size="sm" variant="link">
				Add
			</AppButton>
			<AppButton onClick={action("clicked")} rightIcon={<ExternalLink />} size="sm" variant="link">
				More
			</AppButton>
			<AppButton
				leftIcon={<FileText />}
				onClick={action("clicked")}
				rightIcon={<ChevronRight />}
				size="sm"
				variant="link"
			>
				Details
			</AppButton>
		</div>
	),
};

export const LinkButtonDisabledLarge: Story = {
	args: {
		children: "Disabled Large Link",
		disabled: true,
		onClick: action("clicked"),
		size: "lg",
		variant: "link",
	},
	name: "Link Button - Disabled (Large-sized)",
};

export const LinkButtonDisabledSmall: Story = {
	args: {
		children: "Disabled Small",
		disabled: true,
		onClick: action("clicked"),
		size: "sm",
		variant: "link",
	},
	name: "Link Button - Disabled (Small-sized)",
};

export const LinkWhiteButtonDefault: Story = {
	args: {
		children: "Link White Button",
		onClick: action("clicked"),
		size: "md",
		theme: "light",
		variant: "link",
	},
	decorators: [
		(Story) => (
			<div className="bg-gray-800 p-8 rounded-lg">
				<Story />
			</div>
		),
	],
	name: "Link White Button - Default",
};

export const LinkWhiteButtonWithIcons: Story = {
	name: "Link White Button - With Icons",
	render: () => (
		<div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg">
			<div className="text-sm font-medium text-gray-300 mb-4">Link White Button Icon Variants</div>
			<div className="flex flex-col gap-4">
				<AppButton leftIcon={<ExternalLink />} onClick={action("clicked")} theme="light" variant="link">
					External Link
				</AppButton>
				<AppButton onClick={action("clicked")} rightIcon={<ChevronRight />} theme="light" variant="link">
					Learn More
				</AppButton>
				<AppButton
					leftIcon={<FileText />}
					onClick={action("clicked")}
					rightIcon={<ExternalLink />}
					theme="light"
					variant="link"
				>
					View Documentation
				</AppButton>
			</div>
		</div>
	),
};

export const LinkWhiteButtonDisabled: Story = {
	name: "Link White Button - Disabled",
	render: () => (
		<div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg">
			<div className="text-sm font-medium text-gray-400 mb-4">Disabled Link White States</div>
			<div className="flex flex-col gap-4">
				<AppButton disabled onClick={action("clicked")} theme="light" variant="link">
					Disabled Link
				</AppButton>
				<AppButton
					disabled
					leftIcon={<ExternalLink />}
					onClick={action("clicked")}
					theme="light"
					variant="link"
				>
					Disabled with Left Icon
				</AppButton>
				<AppButton
					disabled
					onClick={action("clicked")}
					rightIcon={<ChevronRight />}
					theme="light"
					variant="link"
				>
					Disabled with Right Icon
				</AppButton>
				<AppButton
					disabled
					leftIcon={<FileText />}
					onClick={action("clicked")}
					rightIcon={<ExternalLink />}
					theme="light"
					variant="link"
				>
					Disabled with Both Icons
				</AppButton>
			</div>
		</div>
	),
};

export const LinkWhiteButtonLarge: Story = {
	args: {
		children: "Large Link White",
		onClick: action("clicked"),
		size: "lg",
		theme: "light",
		variant: "link",
	},
	decorators: [
		(Story) => (
			<div className="bg-gray-800 p-8 rounded-lg">
				<Story />
			</div>
		),
	],
	name: "Link White Button - Large-sized",
};

export const LinkWhiteButtonLargeWithIcons: Story = {
	name: "Link White Button - Large-sized with Icons",
	render: () => (
		<div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-lg">
			<div className="text-sm font-medium text-gray-300 mb-4">Large Link White Buttons</div>
			<div className="flex flex-col gap-4">
				<AppButton leftIcon={<FileText />} onClick={action("clicked")} size="lg" theme="light" variant="link">
					Read More
				</AppButton>
				<AppButton
					onClick={action("clicked")}
					rightIcon={<ExternalLink />}
					size="lg"
					theme="light"
					variant="link"
				>
					Visit Website
				</AppButton>
				<AppButton
					leftIcon={<Download />}
					onClick={action("clicked")}
					rightIcon={<ChevronRight />}
					size="lg"
					theme="light"
					variant="link"
				>
					Download Guide
				</AppButton>
			</div>
		</div>
	),
};

export const LinkWhiteButtonSmall: Story = {
	args: {
		children: "Small Link White",
		onClick: action("clicked"),
		size: "sm",
		theme: "light",
		variant: "link",
	},
	decorators: [
		(Story) => (
			<div className="bg-gray-800 p-8 rounded-lg">
				<Story />
			</div>
		),
	],
	name: "Link White Button - Small-sized",
};

export const LinkWhiteButtonSmallWithIcons: Story = {
	name: "Link White Button - Small-sized with Icons",
	render: () => (
		<div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 rounded-lg">
			<div className="text-sm font-medium text-gray-300 mb-4">Small Link White Buttons</div>
			<div className="flex flex-col gap-3">
				<AppButton leftIcon={<Plus />} onClick={action("clicked")} size="sm" theme="light" variant="link">
					Add
				</AppButton>
				<AppButton
					onClick={action("clicked")}
					rightIcon={<ExternalLink />}
					size="sm"
					theme="light"
					variant="link"
				>
					More
				</AppButton>
				<AppButton
					leftIcon={<FileText />}
					onClick={action("clicked")}
					rightIcon={<ChevronRight />}
					size="sm"
					theme="light"
					variant="link"
				>
					Details
				</AppButton>
			</div>
		</div>
	),
};

export const LinkWhiteButtonDisabledLarge: Story = {
	args: {
		children: "Disabled Large Link White",
		disabled: true,
		onClick: action("clicked"),
		size: "lg",
		theme: "light",
		variant: "link",
	},
	decorators: [
		(Story) => (
			<div className="bg-gray-800 p-8 rounded-lg">
				<Story />
			</div>
		),
	],
	name: "Link White Button - Disabled (Large-sized)",
};

export const LinkWhiteButtonDisabledSmall: Story = {
	args: {
		children: "Disabled Small White",
		disabled: true,
		onClick: action("clicked"),
		size: "sm",
		theme: "light",
		variant: "link",
	},
	decorators: [
		(Story) => (
			<div className="bg-gray-800 p-8 rounded-lg">
				<Story />
			</div>
		),
	],
	name: "Link White Button - Disabled (Small-sized)",
};

export const SecondaryWhiteButtonDefault: Story = {
	args: {
		children: "Secondary White Button",
		onClick: action("clicked"),
		size: "md",
		theme: "light",
		variant: "secondary",
	},
	decorators: [
		(Story) => (
			<div className="bg-gray-800 p-8 rounded-lg">
				<Story />
			</div>
		),
	],
	name: "Secondary White Button - Default",
};

export const SecondaryWhiteButtonWithIcons: Story = {
	name: "Secondary White Button - With Icons",
	render: () => (
		<div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg">
			<div className="text-sm font-medium text-gray-300 mb-4">Secondary White Button Icon Variants</div>
			<div className="flex flex-col gap-4">
				<AppButton leftIcon={<Download />} onClick={action("clicked")} theme="light" variant="secondary">
					Download
				</AppButton>
				<AppButton onClick={action("clicked")} rightIcon={<ExternalLink />} theme="light" variant="secondary">
					Open Link
				</AppButton>
				<AppButton
					leftIcon={<FileText />}
					onClick={action("clicked")}
					rightIcon={<Download />}
					theme="light"
					variant="secondary"
				>
					Export Report
				</AppButton>
			</div>
		</div>
	),
};

export const SecondaryWhiteButtonDisabled: Story = {
	name: "Secondary White Button - Disabled",
	render: () => (
		<div className="bg-gradient-to-br from-slate-900 to-black p-6 rounded-lg">
			<div className="text-sm font-medium text-gray-400 mb-4">Disabled Secondary White States</div>
			<div className="flex flex-col gap-4">
				<AppButton disabled onClick={action("clicked")} theme="light" variant="secondary">
					Disabled
				</AppButton>
				<AppButton
					disabled
					leftIcon={<Download />}
					onClick={action("clicked")}
					theme="light"
					variant="secondary"
				>
					Disabled with Left Icon
				</AppButton>
				<AppButton
					disabled
					onClick={action("clicked")}
					rightIcon={<ExternalLink />}
					theme="light"
					variant="secondary"
				>
					Disabled with Right Icon
				</AppButton>
				<AppButton
					disabled
					leftIcon={<FileText />}
					onClick={action("clicked")}
					rightIcon={<Download />}
					theme="light"
					variant="secondary"
				>
					Disabled with Both Icons
				</AppButton>
			</div>
		</div>
	),
};

export const SecondaryWhiteButtonLarge: Story = {
	args: {
		children: "Large Secondary White",
		onClick: action("clicked"),
		size: "lg",
		theme: "light",
		variant: "secondary",
	},
	decorators: [
		(Story) => (
			<div className="bg-gray-800 p-8 rounded-lg">
				<Story />
			</div>
		),
	],
	name: "Secondary White Button - Large-sized",
};

export const SecondaryWhiteButtonLargeWithIcons: Story = {
	name: "Secondary White Button - Large-sized with Icons",
	render: () => (
		<div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-lg">
			<div className="text-sm font-medium text-gray-300 mb-4">Large Secondary White Buttons</div>
			<div className="flex flex-col gap-4">
				<AppButton
					leftIcon={<FileText />}
					onClick={action("clicked")}
					size="lg"
					theme="light"
					variant="secondary"
				>
					View Details
				</AppButton>
				<AppButton
					onClick={action("clicked")}
					rightIcon={<Download />}
					size="lg"
					theme="light"
					variant="secondary"
				>
					Export Data
				</AppButton>
				<AppButton
					leftIcon={<Save />}
					onClick={action("clicked")}
					rightIcon={<ExternalLink />}
					size="lg"
					theme="light"
					variant="secondary"
				>
					Save and Share
				</AppButton>
			</div>
		</div>
	),
};

export const SecondaryWhiteButtonSmall: Story = {
	args: {
		children: "Small Secondary White",
		onClick: action("clicked"),
		size: "sm",
		theme: "light",
		variant: "secondary",
	},
	decorators: [
		(Story) => (
			<div className="bg-gray-800 p-8 rounded-lg">
				<Story />
			</div>
		),
	],
	name: "Secondary White Button - Small-sized",
};

export const SecondaryWhiteButtonSmallWithIcons: Story = {
	name: "Secondary White Button - Small-sized with Icons",
	render: () => (
		<div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 rounded-lg">
			<div className="text-sm font-medium text-gray-300 mb-4">Small Secondary White Buttons</div>
			<div className="flex flex-col gap-3">
				<AppButton leftIcon={<Plus />} onClick={action("clicked")} size="sm" theme="light" variant="secondary">
					Add
				</AppButton>
				<AppButton onClick={action("clicked")} rightIcon={<X />} size="sm" theme="light" variant="secondary">
					Cancel
				</AppButton>
				<AppButton
					leftIcon={<Save />}
					onClick={action("clicked")}
					rightIcon={<ArrowRight />}
					size="sm"
					theme="light"
					variant="secondary"
				>
					Quick Save
				</AppButton>
			</div>
		</div>
	),
};

export const SecondaryWhiteButtonDisabledLarge: Story = {
	args: {
		children: "Disabled Large Secondary White",
		disabled: true,
		onClick: action("clicked"),
		size: "lg",
		theme: "light",
		variant: "secondary",
	},
	decorators: [
		(Story) => (
			<div className="bg-gray-800 p-8 rounded-lg">
				<Story />
			</div>
		),
	],
	name: "Secondary White Button - Disabled (Large-sized)",
};

export const SecondaryWhiteButtonDisabledSmall: Story = {
	args: {
		children: "Disabled Small White",
		disabled: true,
		onClick: action("clicked"),
		size: "sm",
		theme: "light",
		variant: "secondary",
	},
	decorators: [
		(Story) => (
			<div className="bg-gray-800 p-8 rounded-lg">
				<Story />
			</div>
		),
	],
	name: "Secondary White Button - Disabled (Small-sized)",
};

export const AllVariants: Story = {
	parameters: {
		layout: "fullscreen",
	},
	render: () => (
		<div className="space-y-12 p-8 max-w-7xl mx-auto">
			<div className="space-y-6">
				<h2 className="text-2xl font-bold text-gray-800">Primary Buttons</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="p-4 bg-gray-50 rounded-lg">
						<h3 className="text-sm font-medium text-gray-600 mb-3">Default (Medium)</h3>
						<AppButton onClick={action("clicked")} variant="primary">
							Primary Button
						</AppButton>
					</div>
					<div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
						<h3 className="text-sm font-medium text-gray-600 mb-3">With Icons</h3>
						<div className="flex flex-col gap-3 items-start">
							<AppButton leftIcon={<Upload />} onClick={action("clicked")} variant="primary">
								Upload File
							</AppButton>
							<AppButton onClick={action("clicked")} rightIcon={<ChevronRight />} variant="primary">
								Continue
							</AppButton>
							<AppButton
								leftIcon={<Plus />}
								onClick={action("clicked")}
								rightIcon={<ArrowRight />}
								variant="primary"
							>
								Add Item
							</AppButton>
						</div>
					</div>
					<div className="p-4 bg-black rounded-lg">
						<h3 className="text-sm font-medium text-gray-300 mb-3">Disabled States</h3>
						<div className="flex flex-col gap-3 items-start">
							<AppButton disabled onClick={action("clicked")} variant="primary">
								Disabled
							</AppButton>
							<AppButton disabled leftIcon={<Upload />} onClick={action("clicked")} variant="primary">
								With Icon
							</AppButton>
						</div>
					</div>
					<div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
						<h3 className="text-sm font-medium text-gray-600 mb-3">Size Variations</h3>
						<div className="flex flex-col gap-3 items-start">
							<AppButton onClick={action("clicked")} size="lg" variant="primary">
								Large
							</AppButton>
							<AppButton onClick={action("clicked")} size="md" variant="primary">
								Medium
							</AppButton>
							<AppButton onClick={action("clicked")} size="sm" variant="primary">
								Small
							</AppButton>
						</div>
					</div>
				</div>
			</div>

			<div className="space-y-6">
				<h2 className="text-2xl font-bold text-gray-800">Secondary Buttons</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="p-4 bg-slate-50 rounded-lg">
						<h3 className="text-sm font-medium text-gray-600 mb-3">Default (Medium)</h3>
						<AppButton onClick={action("clicked")} variant="secondary">
							Secondary Button
						</AppButton>
					</div>
					<div className="p-4 bg-gradient-to-br from-slate-50 to-zinc-100 rounded-lg">
						<h3 className="text-sm font-medium text-gray-600 mb-3">With Icons</h3>
						<div className="flex flex-col gap-3 items-start">
							<AppButton leftIcon={<Download />} onClick={action("clicked")} variant="secondary">
								Download
							</AppButton>
							<AppButton onClick={action("clicked")} rightIcon={<ExternalLink />} variant="secondary">
								Open Link
							</AppButton>
							<AppButton
								leftIcon={<FileText />}
								onClick={action("clicked")}
								rightIcon={<Download />}
								variant="secondary"
							>
								Export Report
							</AppButton>
						</div>
					</div>
					<div className="p-4 bg-black rounded-lg">
						<h3 className="text-sm font-medium text-gray-300 mb-3">Disabled States</h3>
						<div className="flex flex-col gap-3 items-start">
							<AppButton disabled onClick={action("clicked")} variant="secondary">
								Disabled
							</AppButton>
							<AppButton disabled leftIcon={<Download />} onClick={action("clicked")} variant="secondary">
								With Icon
							</AppButton>
						</div>
					</div>
					<div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
						<h3 className="text-sm font-medium text-gray-600 mb-3">Size Variations</h3>
						<div className="flex flex-col gap-3 items-start">
							<AppButton onClick={action("clicked")} size="lg" variant="secondary">
								Large
							</AppButton>
							<AppButton onClick={action("clicked")} size="md" variant="secondary">
								Medium
							</AppButton>
							<AppButton onClick={action("clicked")} size="sm" variant="secondary">
								Small
							</AppButton>
						</div>
					</div>
				</div>
			</div>

			<div className="space-y-6">
				<h2 className="text-2xl font-bold text-gray-800">Link Buttons</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="p-4 bg-blue-50 rounded-lg">
						<h3 className="text-sm font-medium text-gray-600 mb-3">Default (Medium)</h3>
						<AppButton onClick={action("clicked")} variant="link">
							Link Button
						</AppButton>
					</div>
					<div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-100 rounded-lg">
						<h3 className="text-sm font-medium text-gray-600 mb-3">With Icons</h3>
						<div className="flex flex-col gap-3 items-start">
							<AppButton leftIcon={<ExternalLink />} onClick={action("clicked")} variant="link">
								External Link
							</AppButton>
							<AppButton onClick={action("clicked")} rightIcon={<ChevronRight />} variant="link">
								Learn More
							</AppButton>
							<AppButton
								leftIcon={<FileText />}
								onClick={action("clicked")}
								rightIcon={<ExternalLink />}
								variant="link"
							>
								View Documentation
							</AppButton>
						</div>
					</div>
					<div className="p-4 bg-gradient-to-br from-blue-200 to-indigo-300 rounded-lg">
						<h3 className="text-sm font-medium text-gray-700 mb-3">Disabled States</h3>
						<div className="flex flex-col gap-3 items-start">
							<AppButton disabled onClick={action("clicked")} variant="link">
								Disabled Link
							</AppButton>
							<AppButton disabled leftIcon={<ExternalLink />} onClick={action("clicked")} variant="link">
								With Icon
							</AppButton>
						</div>
					</div>
					<div className="p-4 bg-gradient-to-br from-cyan-50 to-teal-50 rounded-lg">
						<h3 className="text-sm font-medium text-gray-600 mb-3">Size Variations</h3>
						<div className="flex flex-col gap-3 items-start">
							<AppButton onClick={action("clicked")} size="lg" variant="link">
								Large
							</AppButton>
							<AppButton onClick={action("clicked")} size="md" variant="link">
								Medium
							</AppButton>
							<AppButton onClick={action("clicked")} size="sm" variant="link">
								Small
							</AppButton>
						</div>
					</div>
				</div>
			</div>

			<div className="space-y-6">
				<h2 className="text-2xl font-bold text-gray-800">Link White Buttons</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="p-4 bg-gray-800 rounded-lg">
						<h3 className="text-sm font-medium text-gray-300 mb-3">Default (Medium)</h3>
						<AppButton onClick={action("clicked")} theme="light" variant="link">
							Link White Button
						</AppButton>
					</div>
					<div className="p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg">
						<h3 className="text-sm font-medium text-gray-300 mb-3">With Icons</h3>
						<div className="flex flex-col gap-3 items-start">
							<AppButton
								leftIcon={<ExternalLink />}
								onClick={action("clicked")}
								theme="light"
								variant="link"
							>
								External Link
							</AppButton>
							<AppButton
								onClick={action("clicked")}
								rightIcon={<ChevronRight />}
								theme="light"
								variant="link"
							>
								Learn More
							</AppButton>
							<AppButton
								leftIcon={<FileText />}
								onClick={action("clicked")}
								rightIcon={<ExternalLink />}
								theme="light"
								variant="link"
							>
								View Documentation
							</AppButton>
						</div>
					</div>
					<div className="p-4 bg-gradient-to-br from-gray-900 to-black rounded-lg">
						<h3 className="text-sm font-medium text-gray-300 mb-3">Disabled States</h3>
						<div className="flex flex-col gap-3 items-start">
							<AppButton disabled onClick={action("clicked")} theme="light" variant="link">
								Disabled Link
							</AppButton>
							<AppButton
								disabled
								leftIcon={<ExternalLink />}
								onClick={action("clicked")}
								theme="light"
								variant="link"
							>
								With Icon
							</AppButton>
						</div>
					</div>
					<div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg">
						<h3 className="text-sm font-medium text-gray-300 mb-3">Size Variations</h3>
						<div className="flex flex-col gap-3 items-start">
							<AppButton onClick={action("clicked")} size="lg" theme="light" variant="link">
								Large
							</AppButton>
							<AppButton onClick={action("clicked")} size="md" theme="light" variant="link">
								Medium
							</AppButton>
							<AppButton onClick={action("clicked")} size="sm" theme="light" variant="link">
								Small
							</AppButton>
						</div>
					</div>
				</div>
			</div>

			<div className="space-y-6">
				<h2 className="text-2xl font-bold text-gray-800">Secondary White Buttons</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="p-4 bg-gray-800 rounded-lg">
						<h3 className="text-sm font-medium text-gray-300 mb-3">Default (Medium)</h3>
						<AppButton onClick={action("clicked")} theme="light" variant="secondary">
							Secondary White Button
						</AppButton>
					</div>
					<div className="p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg">
						<h3 className="text-sm font-medium text-gray-300 mb-3">With Icons</h3>
						<div className="flex flex-col gap-3 items-start">
							<AppButton
								leftIcon={<Download />}
								onClick={action("clicked")}
								theme="light"
								variant="secondary"
							>
								Download
							</AppButton>
							<AppButton
								onClick={action("clicked")}
								rightIcon={<ExternalLink />}
								theme="light"
								variant="secondary"
							>
								Open Link
							</AppButton>
							<AppButton
								leftIcon={<FileText />}
								onClick={action("clicked")}
								rightIcon={<Download />}
								theme="light"
								variant="secondary"
							>
								Export Report
							</AppButton>
						</div>
					</div>
					<div className="p-4 bg-gradient-to-br from-gray-900 to-black rounded-lg">
						<h3 className="text-sm font-medium text-gray-300 mb-3">Disabled States</h3>
						<div className="flex flex-col gap-3 items-start">
							<AppButton disabled onClick={action("clicked")} theme="light" variant="secondary">
								Disabled
							</AppButton>
							<AppButton
								disabled
								leftIcon={<Download />}
								onClick={action("clicked")}
								theme="light"
								variant="secondary"
							>
								With Icon
							</AppButton>
						</div>
					</div>
					<div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg">
						<h3 className="text-sm font-medium text-gray-300 mb-3">Size Variations</h3>
						<div className="flex flex-col gap-3 items-start">
							<AppButton onClick={action("clicked")} size="lg" theme="light" variant="secondary">
								Large
							</AppButton>
							<AppButton onClick={action("clicked")} size="md" theme="light" variant="secondary">
								Medium
							</AppButton>
							<AppButton onClick={action("clicked")} size="sm" theme="light" variant="secondary">
								Small
							</AppButton>
						</div>
					</div>
				</div>
			</div>
		</div>
	),
};
