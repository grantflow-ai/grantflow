import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationFactory } from "::testing/factories";

import { ApplicationCard } from "./application-card";

describe("ApplicationCard", () => {
	it("renders application details correctly", () => {
		const application = ApplicationFactory.build({
			description: "This is a test description.",
			status: "In Progress",
			title: "Test Application Title",
		});
		const handleOpen = vi.fn();
		const handleDelete = vi.fn();

		render(<ApplicationCard application={application} onDelete={handleDelete} onOpen={handleOpen} />);

		expect(screen.getByText("Test Application Title")).toBeInTheDocument();
		expect(screen.getByText("This is a test description.")).toBeInTheDocument();
		expect(screen.getByText("In Progress")).toBeInTheDocument();
	});

	it("calls onOpen with correct arguments when 'Open' button is clicked", async () => {
		const application = ApplicationFactory.build();
		const handleOpen = vi.fn();
		const handleDelete = vi.fn();

		render(<ApplicationCard application={application} onDelete={handleDelete} onOpen={handleOpen} />);

		const openButton = screen.getByTestId(`application-card-open-button-${application.id}`);
		await userEvent.click(openButton);

		expect(handleOpen).toHaveBeenCalledWith(application.id, application.title);
	});

	it("calls onDelete when 'Delete' menu item is clicked", async () => {
		const application = ApplicationFactory.build();
		const handleOpen = vi.fn();
		const handleDelete = vi.fn();

		render(<ApplicationCard application={application} onDelete={handleDelete} onOpen={handleOpen} />);

		const menuTrigger = screen.getByTestId("project-card-menu-trigger");
		await userEvent.click(menuTrigger);

		const deleteButton = screen.getByTestId("project-card-delete");
		await userEvent.click(deleteButton);

		expect(handleDelete).toHaveBeenCalledWith(application.id);
	});

	it("displays the deadline when provided", () => {
		const application = ApplicationFactory.build({
			deadline: "2025-12-31",
		});
		const handleOpen = vi.fn();
		const handleDelete = vi.fn();

		render(<ApplicationCard application={application} onDelete={handleDelete} onOpen={handleOpen} />);

		expect(screen.getByText("2025-12-31")).toBeInTheDocument();
	});

	it("does not display the description when it is not provided", () => {
		const application = ApplicationFactory.build({
			description: undefined,
		});
		const handleOpen = vi.fn();
		const handleDelete = vi.fn();

		render(<ApplicationCard application={application} onDelete={handleDelete} onOpen={handleOpen} />);

		expect(screen.queryByTestId(`application-card-description-${application.id}`)).not.toBeInTheDocument();
	});
});
