import { WorkspaceFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { WorkspaceCard } from "./workspace-card";

const meta: Meta<typeof WorkspaceCard> = {
	component: WorkspaceCard,
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
	title: "Components/Workspaces/WorkspaceCard",
};

export default meta;
type Story = StoryObj<typeof WorkspaceCard>;

export const OwnerRole: Story = {
	args: {
		workspace: WorkspaceFactory.build({
			description: "A workspace for climate change research grant applications",
			id: "1",
			name: "Climate Research Grants",
			role: "OWNER",
		}),
	},
};

export const AdminRole: Story = {
	args: {
		workspace: WorkspaceFactory.build({
			description: "Collaborative space for NSF grant proposals and submissions",
			id: "2",
			name: "NSF Proposals",
			role: "ADMIN",
		}),
	},
};

export const MemberRole: Story = {
	args: {
		workspace: WorkspaceFactory.build({
			description: "Team workspace for medical research grant applications",
			id: "3",
			name: "Medical Research Grants",
			role: "MEMBER",
		}),
	},
};

export const LongName: Story = {
	args: {
		workspace: WorkspaceFactory.build({
			description: "A workspace with a very long name to test text truncation",
			id: "4",
			name: "International Collaborative Research Initiative for Sustainable Environmental Solutions",
			role: "OWNER",
		}),
	},
	name: "With Long Name",
};

export const LongDescription: Story = {
	args: {
		workspace: WorkspaceFactory.build({
			description:
				"This is a very long description that should be truncated after two lines. It contains detailed information about the workspace purpose, objectives, team members, current projects, deadlines, and various other details that would normally not fit in the card layout.",
			id: "5",
			name: "Research Team Alpha",
			role: "ADMIN",
		}),
	},
	name: "With Long Description",
};

export const NoDescription: Story = {
	args: {
		workspace: WorkspaceFactory.build({
			description: "",
			id: "6",
			name: "Empty Description Workspace",
			role: "MEMBER",
		}),
	},
};

export const ShortContent: Story = {
	args: {
		workspace: WorkspaceFactory.build({
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
		workspace: WorkspaceFactory.build({
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
				<WorkspaceCard
					workspace={WorkspaceFactory.build({
						description: "Climate change research grants",
						id: "1",
						name: "Climate Research",
						role: "OWNER",
					})}
				/>
				<WorkspaceCard
					workspace={WorkspaceFactory.build({
						description: "National Science Foundation proposals",
						id: "2",
						name: "NSF Grants",
						role: "ADMIN",
					})}
				/>
				<WorkspaceCard
					workspace={WorkspaceFactory.build({
						description: "Medical research funding opportunities",
						id: "3",
						name: "Medical Grants",
						role: "MEMBER",
					})}
				/>
				<WorkspaceCard
					workspace={WorkspaceFactory.build({
						description: "Technology innovation grants",
						id: "4",
						name: "Tech Innovation",
						role: "OWNER",
					})}
				/>
				<WorkspaceCard
					workspace={WorkspaceFactory.build({
						description: "Educational program funding",
						id: "5",
						name: "Education Grants",
						role: "ADMIN",
					})}
				/>
				<WorkspaceCard
					workspace={WorkspaceFactory.build({
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
					<WorkspaceCard
						workspace={WorkspaceFactory.build({
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
