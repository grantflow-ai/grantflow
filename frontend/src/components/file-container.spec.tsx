import { render, screen, waitFor } from "@testing-library/react";
import { FileContainer } from "./file-container";
import { mockToast } from "::testing/global-mocks";
import userEvent from "@testing-library/user-event";

vi.mock("@/actions/sources", () => ({
	createApplicationSourceUploadUrl: vi.fn(),
	deleteApplicationSource: vi.fn(),
}));

globalThis.fetch = vi.fn();

describe("FileContainer", () => {
	const mockWorkspaceId = "workspace-123";
	const mockApplicationId = "application-456";

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(createApplicationSourceUploadUrl).mockResolvedValue({
			url: "https://example.com/upload",
		});

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
		} as Response);
	});

	it("renders initial files when provided", async () => {
		const initialFiles = [
			{
				created_at: "2023-01-01T00:00:00Z",
				filename: "existing.pdf",
				id: "file-1",
				indexing_status: "FINISHED" as const,
				mime_type: "application/pdf",
				size: 1024,
			},
			{
				created_at: "2023-01-01T00:00:00Z",
				filename: "existing2.docx",
				id: "file-2",
				indexing_status: "FINISHED" as const,
				mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				size: 2048,
			},
		];

		render(
			<FileContainer
				applicationId={mockApplicationId}
				initialFiles={initialFiles}
				workspaceId={mockWorkspaceId}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByTestId(`file-card-${initialFiles[0].filename}`)).toBeInTheDocument();
			expect(screen.getByTestId(`file-card-${initialFiles[1].filename}`)).toBeInTheDocument();
		});
	});

	it("renders the file uploader", () => {
		render(<FileContainer applicationId={mockApplicationId} workspaceId={mockWorkspaceId} />);

		expect(screen.getByTestId("file-dropzone")).toBeInTheDocument();
	});

	it("uploads files when added", async () => {
		const user = userEvent.setup();
		render(<FileContainer applicationId={mockApplicationId} workspaceId={mockWorkspaceId} />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const input = screen.getByTestId("file-input");

		await user.upload(input, file);

		await waitFor(() => {
			expect(createApplicationSourceUploadUrl).toHaveBeenCalledWith(
				mockWorkspaceId,
				mockApplicationId,
				"test.pdf",
			);
		});

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith("https://example.com/upload", {
				body: file,
				headers: {
					"Content-Type": "application/pdf",
				},
				method: "PUT",
			});
		});

		await waitFor(() => {
			expect(mockToast.success).toHaveBeenCalledWith("File test.pdf uploaded successfully");
		});
	});

	it("shows an error toast when upload fails", async () => {
		const user = userEvent.setup();
		vi.mocked(fetch).mockResolvedValue({
			ok: false,
		} as Response);

		render(<FileContainer applicationId={mockApplicationId} workspaceId={mockWorkspaceId} />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const input = screen.getByTestId("file-input");

		await user.upload(input, file);

		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith("Failed to upload file. Please try again.");
		});
	});

	it("displays files after they are uploaded", async () => {
		const user = userEvent.setup();
		render(<FileContainer applicationId={mockApplicationId} workspaceId={mockWorkspaceId} />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const input = screen.getByTestId("file-input");

		await user.upload(input, file);

		await waitFor(() => {
			expect(screen.getByTestId(`file-card-${file.name}`)).toBeInTheDocument();
		});
	});

	it("removes files when delete button is clicked", async () => {
		const user = userEvent.setup();
		render(<FileContainer applicationId={mockApplicationId} workspaceId={mockWorkspaceId} />);

		const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
		const input = screen.getByTestId("file-input");

		await user.upload(input, file);

		await waitFor(() => {
			expect(screen.getByTestId(`file-card-${file.name}`)).toBeInTheDocument();
		});

		const removeButton = screen.getByTestId("remove-file-button");
		await user.click(removeButton);

		await waitFor(() => {
			expect(screen.queryByTestId(`file-card-${file.name}`)).not.toBeInTheDocument();
		});

		await waitFor(() => {
			expect(mockToast.success).toHaveBeenCalledWith("File test.pdf removed");
		});
	});
});
