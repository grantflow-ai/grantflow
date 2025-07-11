import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationCard } from "./application-card";
import type { API } from "@/types/api-types";

// Factory function to create application data for tests
type MockApplication = {
	deadline?: string;
	description?: string;
} & API.ListApplications.Http200.ResponseBody["applications"][0];

const createMockApplication = (overrides: Partial<MockApplication> = {}): MockApplication => ({
	completed_at: null,
	created_at: "2025-07-01T12:00:00Z",
	deadline: "4 weeks remaining",
	description: "This is a detailed description for the test grant.",
	id: "app-123",
	project_id: "proj-456",
	schema_id: "schema-789",
	status: "In Progress",
	title: "Test Grant Application",
	updated_at: "2025-07-10T10:00:00Z",
	user_id: "user-abc",
	...overrides,
});

describe("ApplicationCard", () => {
	const onDeleteMock = vi.fn();
	const onOpenMock = vi.fn();

	beforeEach(() => {
		onDeleteMock.mockClear();
		onOpenMock.mockClear();
	});

	it("renders the application card with all details", () => {
		const application = createMockApplication();
		render(<ApplicationCard application={application} onDelete={onDeleteMock} onOpen={onOpenMock} />);

		expect(screen.getByTestId(`application-card-title-${application.id}`)).toHaveTextContent(application.title);
		expect(screen.getByTestId(`application-card-status-${application.id}`)).toHaveTextContent("In Progress");
		expect(screen.getByTestId(`application-card-description-${application.id}`)).toHaveTextContent(
			application.description!,
		);
		expect(screen.getByTestId(`application-card-deadline-${application.id}`)).toHaveTextContent(
			application.deadline!,
		);
	});

	it("calls the onOpen callback when the 'Open' button is clicked", async () => {
		const user = userEvent.setup();
		const application = createMockApplication();
		render(<ApplicationCard application={application} onDelete={onDeleteMock} onOpen={onOpenMock} />);

		const openButton = screen.getByTestId(`application-card-open-button-${application.id}`);
		await user.click(openButton);

		expect(onOpenMock).toHaveBeenCalledWith(application.id, application.title);
		expect(onOpenMock).toHaveBeenCalledTimes(1);
	});

	it("calls the onDelete callback when the 'Delete' menu item is clicked", async () => {
		const user = userEvent.setup();
		const application = createMockApplication();
		render(<ApplicationCard application={application} onDelete={onDeleteMock} onOpen={onOpenMock} />);

		const menuTrigger = screen.getByTestId("project-card-menu-trigger");
		await user.click(menuTrigger);

		const deleteButton = await screen.findByTestId("project-card-delete");
		await user.click(deleteButton);

		expect(onDeleteMock).toHaveBeenCalledWith(application.id);
		expect(onDeleteMock).toHaveBeenCalledTimes(1);
	});

	it("renders correctly when optional fields (description, deadline) are missing", () => {
		const application = createMockApplication({ deadline: undefined, description: undefined });
		render(<ApplicationCard application={application} onDelete={onDeleteMock} onOpen={onOpenMock} />);

		expect(screen.getByTestId(`application-card-${application.id}`)).toBeInTheDocument();
		expect(screen.getByTestId(`application-card-title-${application.id}`)).toHaveTextContent(application.title);

		expect(screen.queryByTestId(`application-card-description-${application.id}`)).not.toBeInTheDocument();
		expect(screen.queryByTestId(`application-card-deadline-${application.id}`)).not.toBeInTheDocument();
	});
});