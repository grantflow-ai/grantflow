import { ProjectFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProjectSettingsNotifications } from "./project-settings-notifications";

const mockProject = ProjectFactory.build();

describe("ProjectSettingsNotifications", () => {
	it("renders all notification settings", () => {
		render(<ProjectSettingsNotifications projectId={mockProject.id} />);

		expect(screen.getByTestId("project-settings-notifications")).toBeInTheDocument();
		expect(screen.getByText("General Email Notifications")).toBeInTheDocument();

		expect(screen.getByText("Receive important email notifications")).toBeInTheDocument();
		expect(
			screen.getByText("Get notified about deadlines, collaborator activity, and grant updates."),
		).toBeInTheDocument();
		expect(screen.getByTestId("email-notifications-toggle")).toBeInTheDocument();

		expect(screen.getByText("Deadline Reminders")).toBeInTheDocument();
		expect(screen.getByText("Get notified 6 days and 1 day before a grant deadline.")).toBeInTheDocument();
		expect(screen.getByTestId("deadline-reminders-toggle")).toBeInTheDocument();

		expect(screen.getByText("Collaboration Activity")).toBeInTheDocument();
		expect(screen.getByText("Notify me when someone comments or edits")).toBeInTheDocument();
		expect(screen.getByText("Stay updated on changes and suggestions from your team.")).toBeInTheDocument();
		expect(screen.getByTestId("collaboration-activity-toggle")).toBeInTheDocument();
	});

	it("has all toggles enabled by default", () => {
		render(<ProjectSettingsNotifications projectId={mockProject.id} />);

		const emailToggle = screen.getByTestId("email-notifications-toggle");
		const deadlineToggle = screen.getByTestId("deadline-reminders-toggle");
		const collaborationToggle = screen.getByTestId("collaboration-activity-toggle");

		expect(emailToggle).toHaveAttribute("aria-checked", "true");
		expect(deadlineToggle).toHaveAttribute("aria-checked", "true");
		expect(collaborationToggle).toHaveAttribute("aria-checked", "true");
	});

	it("toggles email notifications when clicked", async () => {
		const user = userEvent.setup();
		render(<ProjectSettingsNotifications projectId={mockProject.id} />);

		const emailToggle = screen.getByTestId("email-notifications-toggle");

		expect(emailToggle).toHaveAttribute("aria-checked", "true");

		await user.click(emailToggle);
		expect(emailToggle).toHaveAttribute("aria-checked", "false");

		await user.click(emailToggle);
		expect(emailToggle).toHaveAttribute("aria-checked", "true");
	});

	it("toggles deadline reminders when clicked", async () => {
		const user = userEvent.setup();
		render(<ProjectSettingsNotifications projectId={mockProject.id} />);

		const deadlineToggle = screen.getByTestId("deadline-reminders-toggle");

		expect(deadlineToggle).toHaveAttribute("aria-checked", "true");

		await user.click(deadlineToggle);
		expect(deadlineToggle).toHaveAttribute("aria-checked", "false");

		await user.click(deadlineToggle);
		expect(deadlineToggle).toHaveAttribute("aria-checked", "true");
	});

	it("toggles collaboration activity when clicked", async () => {
		const user = userEvent.setup();
		render(<ProjectSettingsNotifications projectId={mockProject.id} />);

		const collaborationToggle = screen.getByTestId("collaboration-activity-toggle");

		expect(collaborationToggle).toHaveAttribute("aria-checked", "true");

		await user.click(collaborationToggle);
		expect(collaborationToggle).toHaveAttribute("aria-checked", "false");

		await user.click(collaborationToggle);
		expect(collaborationToggle).toHaveAttribute("aria-checked", "true");
	});

	it("toggles maintain independent state", async () => {
		const user = userEvent.setup();
		render(<ProjectSettingsNotifications projectId={mockProject.id} />);

		const emailToggle = screen.getByTestId("email-notifications-toggle");
		const deadlineToggle = screen.getByTestId("deadline-reminders-toggle");
		const collaborationToggle = screen.getByTestId("collaboration-activity-toggle");

		await user.click(emailToggle);
		expect(emailToggle).toHaveAttribute("aria-checked", "false");
		expect(deadlineToggle).toHaveAttribute("aria-checked", "true");
		expect(collaborationToggle).toHaveAttribute("aria-checked", "true");

		await user.click(deadlineToggle);
		expect(emailToggle).toHaveAttribute("aria-checked", "false");
		expect(deadlineToggle).toHaveAttribute("aria-checked", "false");
		expect(collaborationToggle).toHaveAttribute("aria-checked", "true");

		await user.click(collaborationToggle);
		expect(emailToggle).toHaveAttribute("aria-checked", "false");
		expect(deadlineToggle).toHaveAttribute("aria-checked", "false");
		expect(collaborationToggle).toHaveAttribute("aria-checked", "false");
	});

	it("has proper accessibility attributes", () => {
		render(<ProjectSettingsNotifications projectId={mockProject.id} />);

		const toggles = [
			screen.getByTestId("email-notifications-toggle"),
			screen.getByTestId("deadline-reminders-toggle"),
			screen.getByTestId("collaboration-activity-toggle"),
		];

		toggles.forEach((toggle) => {
			expect(toggle).toHaveAttribute("role", "switch");
			expect(toggle).toHaveAttribute("type", "button");
			expect(toggle).toHaveAttribute("aria-checked");
		});
	});

	it("applies correct styles based on toggle state", async () => {
		const user = userEvent.setup();
		render(<ProjectSettingsNotifications projectId={mockProject.id} />);

		const emailToggle = screen.getByTestId("email-notifications-toggle");

		expect(emailToggle).toHaveClass("bg-action-primary");

		await user.click(emailToggle);
		expect(emailToggle).toHaveClass("bg-app-gray-300");
		expect(emailToggle).not.toHaveClass("bg-action-primary");
	});

	it("maintains state across multiple toggles", async () => {
		const user = userEvent.setup();
		render(<ProjectSettingsNotifications projectId={mockProject.id} />);

		const emailToggle = screen.getByTestId("email-notifications-toggle");

		for (let i = 0; i < 5; i++) {
			await user.click(emailToggle);
		}

		expect(emailToggle).toHaveAttribute("aria-checked", "false");

		await user.click(emailToggle);
		expect(emailToggle).toHaveAttribute("aria-checked", "true");
	});
});
