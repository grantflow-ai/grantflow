import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import type { API } from "@/types/api-types";
import { GrantApplicationCard } from "./grant-application-card";

const createApplication = (
	overrides: Partial<API.GetProject.Http200.ResponseBody["grant_applications"][0]>,
): API.GetProject.Http200.ResponseBody["grant_applications"][0] => {
	return {
		completed_at: null,
		id: "1",
		title: "Grant Application",
		...overrides,
	};
};

const meta: Meta<typeof GrantApplicationCard> = {
	component: GrantApplicationCard,
	decorators: [
		(Story) => (
			<div className="max-w-lg">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "centered",
		nextjs: {
			navigation: {
				push: action("router.push"),
				refresh: action("router.refresh"),
			},
		},
	},
	title: "Components/Projects/Detail/GrantApplicationCard",
};

export default meta;
type Story = StoryObj<typeof GrantApplicationCard>;

export const Draft: Story = {
	args: {
		application: createApplication({
			id: "1",
			title: "Climate Change Research Grant",
		}),
		projectId: "project-1",
	},
	name: "Draft Application",
};

export const Completed: Story = {
	args: {
		application: createApplication({
			completed_at: "2024-03-15",
			id: "2",
			title: "NSF Research Proposal",
		}),
		projectId: "project-1",
	},
	name: "Completed Application",
};

export const LongTitle: Story = {
	args: {
		application: createApplication({
			id: "3",
			title: "Comprehensive Research Proposal for Sustainable Environmental Solutions and Climate Change Mitigation Strategies in Urban Areas",
		}),
		projectId: "project-1",
	},
	name: "With Long Title",
};

export const RecentlyCompleted: Story = {
	args: {
		application: createApplication({
			completed_at: "2024-12-25",
			id: "4",
			title: "Holiday Research Grant",
		}),
		projectId: "project-1",
	},
};

export const ShortTitle: Story = {
	args: {
		application: createApplication({
			id: "5",
			title: "AI Grant",
		}),
		projectId: "project-1",
	},
};

export const SpecialCharacters: Story = {
	args: {
		application: createApplication({
			completed_at: "2024-06-01",
			id: "6",
			title: "Research & Development / Innovation <Lab> Grant",
		}),
		projectId: "project-1",
	},
	name: "With Special Characters",
};

export const GridLayout: Story = {
	decorators: [
		() => (
			<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
				<GrantApplicationCard
					application={createApplication({
						id: "1",
						title: "Climate Research Draft",
					})}
					projectId="project-1"
				/>
				<GrantApplicationCard
					application={createApplication({
						completed_at: "2024-03-15",
						id: "2",
						title: "Completed NSF Grant",
					})}
					projectId="project-1"
				/>
				<GrantApplicationCard
					application={createApplication({
						id: "3",
						title: "Medical Research Proposal",
					})}
					projectId="project-1"
				/>
				<GrantApplicationCard
					application={createApplication({
						completed_at: "2024-02-28",
						id: "4",
						title: "Technology Innovation Grant",
					})}
					projectId="project-1"
				/>
			</div>
		),
	],
	name: "Grid of Applications",
	parameters: {
		layout: "fullscreen",
	},
};

export const HoverInteraction: Story = {
	args: {
		application: createApplication({
			id: "7",
			title: "Interactive Application Card",
		}),
		projectId: "project-1",
	},
	decorators: [
		(Story) => (
			<div className="space-y-4">
				<div>
					<p className="text-muted-foreground mb-2 text-sm">
						Hover to see the delete button and card effects:
					</p>
					<Story />
				</div>
				<div className="text-muted-foreground text-sm">
					<p>• Background changes on hover</p>
					<p>• Shadow appears</p>
					<p>• Chevron icon moves right</p>
					<p>• Delete button becomes visible</p>
				</div>
			</div>
		),
	],
	name: "Hover Interactions Demo",
};

export const EmptyTitle: Story = {
	args: {
		application: createApplication({
			id: "8",
			title: "",
		}),
		projectId: "project-1",
	},
	name: "Empty Title (Edge Case)",
};

export const AllCompleted: Story = {
	decorators: [
		() => (
			<div className="space-y-3">
				<h3 className="mb-3 text-lg font-semibold">Completed Applications</h3>
				<GrantApplicationCard
					application={createApplication({
						completed_at: "2024-01-15",
						id: "1",
						title: "January Grant Submission",
					})}
					projectId="project-1"
				/>
				<GrantApplicationCard
					application={createApplication({
						completed_at: "2024-02-20",
						id: "2",
						title: "February Research Proposal",
					})}
					projectId="project-1"
				/>
				<GrantApplicationCard
					application={createApplication({
						completed_at: "2024-03-10",
						id: "3",
						title: "March Innovation Grant",
					})}
					projectId="project-1"
				/>
			</div>
		),
	],
	name: "All Completed Applications",
};