import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NewApplicationModal from "@/components/projects/modals/new-application-modal";

describe("NewApplicationModal", () => {
	const handleClose = vi.fn();
	const handleCreate = vi.fn();

	it("should render all static elements when open", () => {
		render(<NewApplicationModal isOpen={true} onClose={handleClose} onCreate={handleCreate} />);
		expect(screen.getByTestId("new-application-modal")).toBeInTheDocument();
		expect(screen.getByTestId("modal-title")).toHaveTextContent("Select a Research Project");
		expect(screen.getByTestId("modal-description")).toHaveTextContent(
			"Every application is part of a Research Project. Please select a project or create a new one.",
		);
		expect(screen.getByTestId("select-trigger")).toBeInTheDocument();
		expect(screen.getByTestId("project-name-input")).toBeInTheDocument();
		expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
		expect(screen.getByTestId("select-button")).toBeInTheDocument();
	});
});
