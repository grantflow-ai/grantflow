import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const meta: Meta<typeof DropdownMenu> = {
	component: DropdownMenu,
	title: "Components/Menus/DropdownMenu",
};
export default meta;

type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
	args: {
		children: (
			<>
				<DropdownMenuTrigger asChild>
					<button className="px-3 py-2 bg-primary text-white rounded" type="button">
						Open Menu
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>Menu item</DropdownMenuItem>
					<DropdownMenuItem>Menu item</DropdownMenuItem>
					<DropdownMenuItem>Menu item - Last</DropdownMenuItem>
				</DropdownMenuContent>
			</>
		),
	},
};

export const FigmaSpecPreview: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button className="px-3 py-2 bg-primary text-white rounded" type="button">
					Open Menu
				</button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				className={`
          w-[208px] 
          h-[223px] 
          p-1 
          rounded-[4px] 
          border border-[#E1DFEB] 
          bg-popover 
          shadow-none
        `}
			>
				<DropdownMenuItem className="w-[198px] h-[43px] rounded-[4px] hover:bg-blue-100">
					Menu item 1
				</DropdownMenuItem>
				<DropdownMenuItem className="w-[200px] h-[43px] rounded-[4px] hover:bg-blue-100">
					Menu item 2
				</DropdownMenuItem>
				<DropdownMenuItem className="w-[200px] h-[43px] rounded-[4px] hover:bg-blue-100">
					Menu item 3
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const CheckboxMenuItem: Story = {
	args: {
		children: (
			<>
				<DropdownMenuTrigger asChild>
					<button className="px-3 py-2 bg-primary text-white rounded" type="button">
						Open Menu
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuCheckboxItem checked={true}>Menu item</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem>Menu item</DropdownMenuCheckboxItem>
				</DropdownMenuContent>
			</>
		),
	},
};

export const RadioMenuItem: Story = {
	args: {
		children: (
			<>
				<DropdownMenuTrigger asChild>
					<button className="px-3 py-2 bg-primary text-white rounded" type="button">
						Open Menu
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuRadioGroup value="none">
						<DropdownMenuRadioItem value="Item 1">Menu item</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="Item 2">Menu item</DropdownMenuRadioItem>
					</DropdownMenuRadioGroup>
				</DropdownMenuContent>
			</>
		),
	},
};
