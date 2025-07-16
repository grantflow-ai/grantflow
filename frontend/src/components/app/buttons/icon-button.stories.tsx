import { Plus } from "lucide-react";

import { IconButton } from "./icon-button";

const meta = {
	argTypes: {
		disabled: {
			control: "boolean",
		},
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
		variant: {
			control: "select",
			options: ["solid", "float"],
		},
	},
	component: IconButton,
	parameters: {
		layout: "centered",
	},
	title: "Components/Buttons/IconButton",
};

export default meta;

export const Default = {
	args: {
		children: <Plus className="size-4" />,
		size: "md",
		variant: "solid",
	},
};

export const Solid = {
	args: {
		children: <Plus className="size-4" />,
		variant: "solid",
	},
};

export const Float = {
	args: {
		children: <Plus className="size-4" />,
		variant: "float",
	},
};

export const Small = {
	args: {
		children: <Plus className="size-3" />,
		size: "sm",
		variant: "solid",
	},
};

export const Medium = {
	args: {
		children: <Plus className="size-4" />,
		size: "md",
		variant: "solid",
	},
};

export const Large = {
	args: {
		children: <Plus className="size-5" />,
		size: "lg",
		variant: "solid",
	},
};

export const Disabled = {
	args: {
		children: <Plus className="size-4" />,
		disabled: true,
		variant: "solid",
	},
};

export const AllVariants = {
	render: () => (
		<div className="flex flex-col gap-8">
			<div>
				<h3 className="mb-4 text-sm font-medium">Solid Variant</h3>
				<div className="flex items-center gap-4">
					<IconButton size="sm" variant="solid">
						<Plus className="size-3" />
					</IconButton>
					<IconButton size="md" variant="solid">
						<Plus className="size-4" />
					</IconButton>
					<IconButton size="lg" variant="solid">
						<Plus className="size-5" />
					</IconButton>
					<IconButton disabled size="md" variant="solid">
						<Plus className="size-4" />
					</IconButton>
				</div>
			</div>

			<div>
				<h3 className="mb-4 text-sm font-medium">Float Variant</h3>
				<div className="flex items-center gap-4">
					<IconButton size="sm" variant="float">
						<Plus className="size-3" />
					</IconButton>
					<IconButton size="md" variant="float">
						<Plus className="size-4" />
					</IconButton>
					<IconButton size="lg" variant="float">
						<Plus className="size-5" />
					</IconButton>
					<IconButton disabled size="md" variant="float">
						<Plus className="size-4" />
					</IconButton>
				</div>
			</div>
		</div>
	),
};
