import type { Meta, StoryObj } from "@storybook/react-vite";

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "../../ui/select";

const meta: Meta<typeof Select> = {
	component: Select,
	title: "UI/Select",
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
	args: {
		children: (
			<>
				<SelectTrigger>
					<SelectValue placeholder="Select an option" />
				</SelectTrigger>

				<SelectContent>
					<SelectItem value={"Option 1"}>Option 1</SelectItem>
					<SelectItem value={"Option 2"}>Option 2</SelectItem>
					<SelectItem value={"Option 3"}>Option 3</SelectItem>
				</SelectContent>
			</>
		),
	},
};

export const WithScrollButtons: Story = {
	args: {
		children: (
			<>
				<SelectTrigger>
					<SelectValue placeholder="Select an option" />
				</SelectTrigger>

				<SelectContent className="max-h-[200px]">
					<SelectScrollUpButton />
					<SelectItem value="1">One</SelectItem>
					<SelectItem value="2">Two</SelectItem>
					<SelectItem value="3">Three</SelectItem>
					<SelectItem value="4">Four</SelectItem>
					<SelectItem value="5">Five</SelectItem>
					<SelectItem value="6">Six</SelectItem>
					<SelectItem value="7">Seven</SelectItem>
					<SelectItem value="8">Eight</SelectItem>
					<SelectItem value="9">Nine</SelectItem>
					<SelectItem value="10">Ten</SelectItem>
					<SelectItem value="11">Eleven</SelectItem>
					<SelectItem value="12">Twelve</SelectItem>
					<SelectItem value="13">Thirteen</SelectItem>
					<SelectItem value="14">Fourteen</SelectItem>
					<SelectItem value="15">Fifteen</SelectItem>
					<SelectItem value="16">Sixteen</SelectItem>
					<SelectItem value="17">Seventeen</SelectItem>
					<SelectItem value="18">Eighteen</SelectItem>
					<SelectItem value="19">Nineteen</SelectItem>
					<SelectItem value="20">Twenty</SelectItem>
					<SelectItem value="21">Twenty-one</SelectItem>
					<SelectItem value="22">Twenty-two</SelectItem>
					<SelectItem value="23">Twenty-three</SelectItem>
					<SelectItem value="24">Twenty-four</SelectItem>
					<SelectItem value="25">Twenty-five</SelectItem>
					<SelectScrollDownButton />
				</SelectContent>
			</>
		),
	},
};

export const WithDisabledItems: Story = {
	args: {
		children: (
			<>
				<SelectTrigger className="w-[180px]">
					<SelectValue placeholder="Select a status" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="active">Active</SelectItem>
					<SelectItem value="inactive">Inactive</SelectItem>
					<SelectItem disabled value="pending">
						Pending (Coming Soon)
					</SelectItem>
				</SelectContent>
			</>
		),
	},
};

export const WithGroups: Story = {
	args: {
		children: (
			<>
				<SelectTrigger className="w-[180px]">
					<SelectValue placeholder="Select an option" />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{" "}
						Group A:
						<SelectLabel>Group A</SelectLabel>
						<SelectItem value="Group A">Group A</SelectItem>
						<SelectItem value="Group A">Group A</SelectItem>
						<SelectItem value="Group A">Group A</SelectItem>
					</SelectGroup>
					<SelectSeparator />
					<SelectGroup>
						{" "}
						Group B<SelectLabel>Group B</SelectLabel>
						<SelectItem value="Group B">Group B</SelectItem>
						<SelectItem value="Group B">Group B</SelectItem>
						<SelectItem value="Group B">Group B</SelectItem>
					</SelectGroup>
				</SelectContent>
			</>
		),
	},
};
