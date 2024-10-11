// import en from "@/localisations/en.json";
// import { render, screen } from "@testing-library/react";
// import { CreateWorkspaceModal } from "./create-workspace-modal";
//
// // this is required because the serverLogger declares 'use server';
// vi.mock("@t3-oss/env-nextjs");
// vi.mock("@/utils/env", () => ({
// 	getEnv: vi.fn().mockReturnValue({
// 		NEXT_PUBLIC_DEBUG: true,
// 	}),
// }));
//
// describe("CreateWorkspaceModal", () => {
// 	const mockOrganizationId = "org-123";
//
// 	it("renders the create workspace button", () => {
// 		render(<CreateWorkspaceModal organizationId={mockOrganizationId} locales={en} />);
//
// 		const createButton = screen.getByTestId("create-workspace-button");
// 		expect(createButton).toBeInTheDocument();
// 		expect(createButton).toHaveTextContent(en.organizationView.createWorkspace);
// 	});
// });
