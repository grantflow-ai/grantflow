import { ApplicationFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApplicationCard } from "./application-card";

describe("ApplicationCard", () => {
	it("renders application details correctly", () => {
		const application = ApplicationFactory.build({
			description: "This is a test description.",
			status: "IN_PROGRESS",
			title: "Test Application Title",
		});
		const handleOpen = vi.fn();
		const handleDelete = vi.fn();
		const handleDuplicate = vi.fn();

		render(
			<ApplicationCard
				application={application}
				onDelete={handleDelete}
				onDuplicate={handleDuplicate}
				onOpen={handleOpen}
			/>,
		);

		expect(screen.getByText("Test Application Title")).toBeInTheDocument();
		expect(screen.getByText("This is a test description.")).toBeInTheDocument();
		expect(screen.getByText("In Progress")).toBeInTheDocument();
	});

	it("calls onOpen with correct arguments when 'Open' button is clicked", async () => {
		const application = ApplicationFactory.build();
		const handleOpen = vi.fn();
		const handleDelete = vi.fn();
		const handleDuplicate = vi.fn();

		render(
			<ApplicationCard
				application={application}
				onDelete={handleDelete}
				onDuplicate={handleDuplicate}
				onOpen={handleOpen}
			/>,
		);

		const openButton = screen.getByTestId(`application-card-open-button-${application.id}`);
		await userEvent.click(openButton);

		expect(handleOpen).toHaveBeenCalledWith(application.id, application.title);
	});

	it("calls onDelete when 'Delete' menu item is clicked", async () => {
		const application = ApplicationFactory.build();
		const handleOpen = vi.fn();
		const handleDelete = vi.fn();
		const handleDuplicate = vi.fn();

		render(
			<ApplicationCard
				application={application}
				onDelete={handleDelete}
				onDuplicate={handleDuplicate}
				onOpen={handleOpen}
			/>,
		);

		const menuTrigger = screen.getByTestId("project-card-menu-trigger");
		await userEvent.click(menuTrigger);

		const deleteButton = screen.getByTestId("project-card-delete");
		await userEvent.click(deleteButton);

		expect(handleDelete).toHaveBeenCalledWith(application.id);
	});

	it("calls onDuplicate when 'Duplicate' menu item is clicked", async () => {
		const application = ApplicationFactory.build({
			title: "Test Application",
		});
		const handleOpen = vi.fn();
		const handleDelete = vi.fn();
		const handleDuplicate = vi.fn();

		render(
			<ApplicationCard
				application={application}
				onDelete={handleDelete}
				onDuplicate={handleDuplicate}
				onOpen={handleOpen}
			/>,
		);

		const menuTrigger = screen.getByTestId("project-card-menu-trigger");
		await userEvent.click(menuTrigger);

		const duplicateButton = screen.getByTestId("project-card-duplicate");
		await userEvent.click(duplicateButton);

		expect(handleDuplicate).toHaveBeenCalledWith(application.id, "Test Application");
	});

	it("displays the deadline when provided", () => {
		const application = ApplicationFactory.build({
			deadline: "2025-12-31T23:59:59.000Z",
		});
		const handleOpen = vi.fn();
		const handleDelete = vi.fn();
		const handleDuplicate = vi.fn();

		render(
			<ApplicationCard
				application={application}
				onDelete={handleDelete}
				onDuplicate={handleDuplicate}
				onOpen={handleOpen}
			/>,
		);

		// Test that deadline text is present - this confirms the feature works
		expect(screen.getByText(/Deadline/)).toBeInTheDocument();
		// Test that the format is correct (dd.MM.yy format)
		expect(screen.getByText(/Deadline \d{2}\.\d{2}\.\d{2}/)).toBeInTheDocument();
	});

	it("does not display the deadline when it is not provided", () => {
		const application = ApplicationFactory.build({
			deadline: undefined,
		});
		const handleOpen = vi.fn();
		const handleDelete = vi.fn();
		const handleDuplicate = vi.fn();

		render(
			<ApplicationCard
				application={application}
				onDelete={handleDelete}
				onDuplicate={handleDuplicate}
				onOpen={handleOpen}
			/>,
		);

		expect(screen.queryByText(/Deadline/)).not.toBeInTheDocument();
	});

	it("does not display the description when it is not provided", () => {
		const application = ApplicationFactory.build({
			description: undefined,
		});
		const handleOpen = vi.fn();
		const handleDelete = vi.fn();
		const handleDuplicate = vi.fn();

		render(
			<ApplicationCard
				application={application}
				onDelete={handleDelete}
				onDuplicate={handleDuplicate}
				onOpen={handleOpen}
			/>,
		);

		expect(screen.queryByTestId(`application-card-description-${application.id}`)).not.toBeInTheDocument();
	});
});
