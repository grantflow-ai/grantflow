import en from "@/localisations/en.json";
import { render, screen } from "@testing-library/react";
import { CreateWorkspaceModal } from "./create-workspace-modal";

describe("CreateWorkspaceModal", () => {
	const mockOrganizationId = "org-123";

	it("renders the create workspace button", () => {
		render(<CreateWorkspaceModal organizationId={mockOrganizationId} locales={en} />);

		const createButton = screen.getByTestId("create-workspace-button");
		expect(createButton).toBeInTheDocument();
		expect(createButton).toHaveTextContent(en.organizationView.createWorkspace);
	});
});
