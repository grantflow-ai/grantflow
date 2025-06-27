import { ProjectListItemFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProjectCard } from "./project-card";

const meta: Meta<typeof ProjectCard> = {
	component: ProjectCard,
	decorators: [
		(Story) => (
			<div className="max-w-md">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "centered",
	},
	title: "Components/Projects/ProjectCard",
};

export default meta;
type Story = StoryObj<typeof ProjectCard>;

export const OwnerRole: Story = {
	args: {
		project: ProjectListItemFactory.build({
			description: "A project for climate change research grant applications",
			id: "1",
			name: "Climate Research Grants",
			role: "OWNER",
		}),
	},
};

export const AdminRole: Story = {
	args: {
		project: ProjectListItemFactory.build({
			description: "Collaborative space for NSF grant proposals and submissions",
			id: "2",
			name: "NSF Proposals",
			role: "ADMIN",
		}),
	},
};

export const MemberRole: Story = {
	args: {
		project: ProjectListItemFactory.build({
			description: "Team project for medical research grant applications",
			id: "3",
			name: "Medical Research Grants",
			role: "MEMBER",
		}),
	},
};

export const LongName: Story = {
	args: {
		project: ProjectListItemFactory.build({
			description: "A project with a very long name to test text truncation",
			id: "4",
			name: "International Collaborative Research Initiative for Sustainable Environmental Solutions",
			role: "OWNER",
		}),
	},
	name: "With Long Name",
};

export const LongDescription: Story = {
	args: {
		project: ProjectListItemFactory.build({
			description:
				"This is a very long description that should be truncated after two lines. It contains detailed information about the project purpose, objectives, team members, current projects, deadlines, and various other details that would normally not fit in the card layout.",
			id: "5",
			name: "Research Team Alpha",
			role: "ADMIN",
		}),
	},
	name: "With Long Description",
};

export const NoDescription: Story = {
	args: {
		project: ProjectListItemFactory.build({
			description: "",
			id: "6",
			name: "Empty Description Project",
			role: "MEMBER",
		}),
	},
};

export const ShortContent: Story = {
	args: {
		project: ProjectListItemFactory.build({
			description: "Brief.",
			id: "7",
			name: "Short",
			role: "OWNER",
		}),
	},
	name: "With Short Content",
};

export const SpecialCharacters: Story = {
	args: {
		project: ProjectListItemFactory.build({
			description: "Research & Development / Innovation <Lab>",
			id: "8",
			name: "R&D / Tech <Innovation>",
			role: "ADMIN",
		}),
	},
	name: "With Special Characters",
};

export const GridLayout: Story = {
	decorators: [
		() => (
			<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
				<ProjectCard
					project={ProjectListItemFactory.build({
						description: "Climate change research grants",
						id: "1",
						name: "Climate Research",
						role: "OWNER",
					})}
				/>
				<ProjectCard
					project={ProjectListItemFactory.build({
						description: "National Science Foundation proposals",
						id: "2",
						name: "NSF Grants",
						role: "ADMIN",
					})}
				/>
				<ProjectCard
					project={ProjectListItemFactory.build({
						description: "Medical research funding opportunities",
						id: "3",
						name: "Medical Grants",
						role: "MEMBER",
					})}
				/>
				<ProjectCard
					project={ProjectListItemFactory.build({
						description: "Technology innovation grants",
						id: "4",
						name: "Tech Innovation",
						role: "OWNER",
					})}
				/>
				<ProjectCard
					project={ProjectListItemFactory.build({
						description: "Educational program funding",
						id: "5",
						name: "Education Grants",
						role: "ADMIN",
					})}
				/>
				<ProjectCard
					project={ProjectListItemFactory.build({
						description: "Community development projects",
						id: "6",
						name: "Community Projects",
						role: "MEMBER",
					})}
				/>
			</div>
		),
	],
	name: "Grid of Cards",
	parameters: {
		layout: "fullscreen",
	},
};

export const HoverStates: Story = {
	decorators: [
		() => (
			<div className="space-y-4">
				<div>
					<p className="text-muted-foreground mb-2 text-sm">Normal state:</p>
					<ProjectCard
						project={ProjectListItemFactory.build({
							description: "Hover over this card to see the transition effects",
							id: "1",
							name: "Interactive Card",
							role: "OWNER",
						})}
					/>
				</div>
				<div>
					<p className="text-muted-foreground mb-2 text-sm">
						The card has hover effects on the background, shadow, and chevron icon
					</p>
				</div>
			</div>
		),
	],
	name: "Interactive Hover States",
	parameters: {
		layout: "padded",
	},
};