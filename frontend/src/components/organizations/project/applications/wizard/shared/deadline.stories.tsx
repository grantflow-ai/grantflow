import { ApplicationWithTemplateFactory, GrantTemplateFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { useApplicationStore } from "@/stores/application-store";
import { Deadline } from "./deadline";

const meta: Meta<typeof Deadline> = {
	component: Deadline,
	decorators: [
		(Story) => (
			<div className="p-8 bg-light">
				<div className="max-w-sm mx-auto">
					<Story />
				</div>
			</div>
		),
	],
	parameters: {
		layout: "centered",
	},
	title: "Wizard/Components/Deadline",
};

export default meta;
type Story = StoryObj<typeof Deadline>;

export const NoDeadlineSet: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build({
					submission_date: undefined,
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
				});
				useApplicationStore.setState({
					application,
				});
			}, []);
			return <Story />;
		},
	],
};

export const PlentifulTimeRemaining: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const futureDate = new Date();
				futureDate.setDate(futureDate.getDate() + 30);

				const grantTemplate = GrantTemplateFactory.build({
					submission_date: futureDate.toISOString(),
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
				});
				useApplicationStore.setState({
					application,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Plentiful Time - 30 Days",
};

export const UrgentDeadline: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const urgentDate = new Date();
				urgentDate.setDate(urgentDate.getDate() + 1);

				const grantTemplate = GrantTemplateFactory.build({
					submission_date: urgentDate.toISOString(),
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
				});
				useApplicationStore.setState({
					application,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Urgent Deadline - 1 Day",
};

export const VeryUrgentDeadline: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const veryUrgentDate = new Date();
				veryUrgentDate.setHours(veryUrgentDate.getHours() + 6);

				const grantTemplate = GrantTemplateFactory.build({
					submission_date: veryUrgentDate.toISOString(),
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
				});
				useApplicationStore.setState({
					application,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Very Urgent - 6 Hours",
};

export const CriticalDeadline: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const criticalDate = new Date();
				criticalDate.setMinutes(criticalDate.getMinutes() + 45);

				const grantTemplate = GrantTemplateFactory.build({
					submission_date: criticalDate.toISOString(),
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
				});
				useApplicationStore.setState({
					application,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Critical - 45 Minutes",
};

export const DeadlinePassed: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const pastDate = new Date();
				pastDate.setDate(pastDate.getDate() - 5);

				const grantTemplate = GrantTemplateFactory.build({
					submission_date: pastDate.toISOString(),
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
				});
				useApplicationStore.setState({
					application,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Deadline Passed - 5 Days Ago",
};

export const RecentlyPassed: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const recentPastDate = new Date();
				recentPastDate.setHours(recentPastDate.getHours() - 2);

				const grantTemplate = GrantTemplateFactory.build({
					submission_date: recentPastDate.toISOString(),
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
				});
				useApplicationStore.setState({
					application,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Recently Passed - 2 Hours Ago",
};

export const AllDeadlineStates: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const futureDate = new Date();
				futureDate.setDate(futureDate.getDate() + 7);

				const grantTemplate = GrantTemplateFactory.build({
					submission_date: futureDate.toISOString(),
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
				});
				useApplicationStore.setState({
					application,
				});
			}, []);
			return <Story />;
		},
	],
	name: "One Week Remaining",
};
