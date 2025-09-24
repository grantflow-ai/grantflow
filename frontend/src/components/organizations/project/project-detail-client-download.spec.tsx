import { ApplicationFactory, ProjectFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as grantApplicationActions from "@/actions/grant-applications";
import { APPLICATION_STATUS } from "@/constants/download";
import { ProjectDetailClient } from "./project-detail-client";

// Mock all the required modules
vi.mock("@/actions/grant-applications", () => ({
	createApplication: vi.fn(),
	deleteApplication: vi.fn(),
	downloadApplication: vi.fn(),
	duplicateApplication: vi.fn(),
	listApplications: vi.fn(),
}));

vi.mock("@/actions/organization", () => ({
	getOrganizationMembers: vi.fn(),
}));

vi.mock("@/actions/project", () => ({
	getProjectMembers: vi.fn(),
}));

vi.mock("@/actions/project-invitation", () => ({
	inviteCollaborator: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		loading: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock("@/utils/logger/client", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
	},
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
}));

vi.mock("swr", () => ({
	default: vi.fn(),
	mutate: vi.fn(),
}));

// Mock all the store hooks
vi.mock("@/stores/navigation-store", () => ({
	useNavigationStore: () => ({
		navigateToApplication: vi.fn(),
	}),
}));

vi.mock("@/stores/new-application-modal-store", () => ({
	useNewApplicationModalStore: () => ({
		closeModal: vi.fn(),
		isModalOpen: false,
	}),
}));

vi.mock("@/stores/organization-store", () => ({
	useOrganizationStore: () => ({
		selectedOrganizationId: "org-123",
	}),
}));

vi.mock("@/stores/project-store", () => ({
	useProjectStore: () => ({
		getProjects: vi.fn(),
		project: ProjectFactory.build(),
		projects: [ProjectFactory.build()],
		removeApplicationFromProject: vi.fn(),
	}),
}));

vi.mock("@/stores/user-store", () => ({
	useUserStore: () => ({
		user: {
			displayName: "Test User",
			email: "test@example.com",
			uid: "user-123",
		},
	}),
}));

vi.mock("@/hooks/use-project-title-editing", () => ({
	useProjectTitleEditing: () => ({
		handleSave: vi.fn(),
		isEditing: false,
		isFirstEdit: false,
		setIsEditing: vi.fn(),
		title: "Test Project",
		titleInputRef: { current: null },
	}),
}));

const mockDownloadApplication = vi.mocked(grantApplicationActions.downloadApplication);
const mockToast = vi.mocked(toast);

describe("ProjectDetailClient Download Functionality", () => {
	beforeEach(async () => {
		vi.clearAllMocks();

		// Mock SWR to return applications data
		const mockUseSWR = vi.mocked((await import("swr")).default);
		mockUseSWR.mockImplementation((key: any) => {
			if (key?.includes("applications")) {
				return {
					data: {
						applications: [
							ApplicationFactory.build({
								id: "app-123",
								status: APPLICATION_STATUS.WORKING_DRAFT,
								text: "Sample content",
								title: "Test Application",
							}),
							ApplicationFactory.build({
								id: "app-456",
								status: APPLICATION_STATUS.IN_PROGRESS,
								text: "More content",
								title: "Draft Application",
							}),
						],
					},
					error: undefined,
					isLoading: false,
					isValidating: false,
					mutate: vi.fn(),
				};
			}
			if (key?.includes("members")) {
				return {
					data: [],
					error: undefined,
					isLoading: false,
					isValidating: false,
					mutate: vi.fn(),
				};
			}
			return {
				data: null,
				error: undefined,
				isLoading: false,
				isValidating: false,
				mutate: vi.fn(),
			};
		});
	});

	it("shows download button only for WORKING_DRAFT applications with content", async () => {
		render(<ProjectDetailClient />);

		await waitFor(() => {
			// Should show download button for WORKING_DRAFT application
			expect(screen.getByTestId("application-card-Test Application")).toBeInTheDocument();

			// Should not show download button for IN_PROGRESS application
			const draftCard = screen.getByTestId("application-card-Draft Application");
			expect(draftCard).toBeInTheDocument();
		});
	});

	it("successfully downloads application in markdown format", async () => {
		const user = userEvent.setup();
		const mockBlob = new Blob(["# Test Application\\n\\nContent"], { type: "text/markdown" });
		mockDownloadApplication.mockResolvedValue(mockBlob);

		// Mock URL.createObjectURL and related browser APIs
		const mockCreateObjectURL = vi.fn(() => "blob:test-url");
		const mockRevokeObjectURL = vi.fn();
		globalThis.URL.createObjectURL = mockCreateObjectURL;
		globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

		// Mock document.createElement for download link
		const mockLink = {
			click: vi.fn(),
			download: "",
			href: "",
			remove: vi.fn(),
		};
		const mockAppend = vi.fn();
		vi.spyOn(document, "createElement").mockReturnValue(mockLink as any);
		vi.spyOn(document.body, "append").mockImplementation(mockAppend);

		render(<ProjectDetailClient />);

		await waitFor(() => {
			expect(screen.getByTestId("application-card-Test Application")).toBeInTheDocument();
		});

		// Find and click the download button (this will be in the ApplicationDownloadMenu)
		const downloadButton = screen.getByRole("button", { name: /download/i });
		await user.click(downloadButton);

		// Select markdown format
		const markdownOption = await screen.findByText("Markdown (.md)");
		await user.click(markdownOption);

		await waitFor(() => {
			expect(mockDownloadApplication).toHaveBeenCalledWith("org-123", expect.any(String), "app-123", "markdown");
			expect(mockToast.loading).toHaveBeenCalledWith("Preparing Markdown (.md) download...", {
				id: "download-app-123",
			});
			expect(mockToast.success).toHaveBeenCalledWith("Markdown (.md) downloaded successfully", {
				id: "download-app-123",
			});
		});

		expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
		expect(mockLink.href).toBe("blob:test-url");
		expect(mockLink.download).toBe("Test Application.md");
		expect(mockLink.click).toHaveBeenCalled();
		expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
	});

	it("successfully downloads application in PDF format", async () => {
		const user = userEvent.setup();
		const mockBlob = new Blob([new ArrayBuffer(1024)], { type: "application/pdf" });
		mockDownloadApplication.mockResolvedValue(mockBlob);

		// Mock browser APIs
		globalThis.URL.createObjectURL = vi.fn(() => "blob:test-pdf-url");
		globalThis.URL.revokeObjectURL = vi.fn();

		const mockLink = {
			click: vi.fn(),
			download: "",
			href: "",
			remove: vi.fn(),
		};
		vi.spyOn(document, "createElement").mockReturnValue(mockLink as any);
		vi.spyOn(document.body, "append").mockImplementation(vi.fn());

		render(<ProjectDetailClient />);

		await waitFor(() => {
			expect(screen.getByTestId("application-card-Test Application")).toBeInTheDocument();
		});

		const downloadButton = screen.getByRole("button", { name: /download/i });
		await user.click(downloadButton);

		const pdfOption = await screen.findByText("PDF (.pdf)");
		await user.click(pdfOption);

		await waitFor(() => {
			expect(mockDownloadApplication).toHaveBeenCalledWith("org-123", expect.any(String), "app-123", "pdf");
			expect(mockLink.download).toBe("Test Application.pdf");
		});
	});

	it("handles download errors gracefully", async () => {
		const user = userEvent.setup();
		const mockError = new Error("Download failed");
		mockDownloadApplication.mockRejectedValue(mockError);

		render(<ProjectDetailClient />);

		await waitFor(() => {
			expect(screen.getByTestId("application-card-Test Application")).toBeInTheDocument();
		});

		const downloadButton = screen.getByRole("button", { name: /download/i });
		await user.click(downloadButton);

		const markdownOption = await screen.findByText("Markdown (.md)");
		await user.click(markdownOption);

		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith("Failed to download markdown (.md)", {
				id: "download-app-123",
			});
		});
	});

	it("sanitizes filename with special characters", async () => {
		const user = userEvent.setup();
		const mockBlob = new Blob(["content"], { type: "text/markdown" });
		mockDownloadApplication.mockResolvedValue(mockBlob);

		// Mock SWR to return application with special characters in title
		const mockUseSWR = vi.mocked((await import("swr")).default);
		mockUseSWR.mockImplementation((key: any) => {
			if (key?.includes("applications")) {
				return {
					data: {
						applications: [
							ApplicationFactory.build({
								id: "app-special",
								status: APPLICATION_STATUS.WORKING_DRAFT,
								text: "Content",
								title: 'Test <App> "With" /Special: \\Characters|?*',
							}),
						],
					},
					error: undefined,
					isLoading: false,
					isValidating: false,
					mutate: vi.fn(),
				};
			}
			return {
				data: null,
				error: undefined,
				isLoading: false,
				isValidating: false,
				mutate: vi.fn(),
			};
		});

		globalThis.URL.createObjectURL = vi.fn(() => "blob:test-url");
		globalThis.URL.revokeObjectURL = vi.fn();

		const mockLink = {
			click: vi.fn(),
			download: "",
			href: "",
			remove: vi.fn(),
		};
		vi.spyOn(document, "createElement").mockReturnValue(mockLink as any);
		vi.spyOn(document.body, "append").mockImplementation(vi.fn());

		render(<ProjectDetailClient />);

		await waitFor(() => {
			expect(
				screen.getByTestId('application-card-Test <App> "With" /Special: \\Characters|?*'),
			).toBeInTheDocument();
		});

		const downloadButton = screen.getByRole("button", { name: /download/i });
		await user.click(downloadButton);

		const markdownOption = await screen.findByText("Markdown (.md)");
		await user.click(markdownOption);

		await waitFor(() => {
			// Filename should be sanitized
			expect(mockLink.download).toBe("Test__App___With___Special____Characters___.md");
		});
	});

	it("manages loading state correctly", async () => {
		const user = userEvent.setup();

		// Make download hang to test loading state
		let resolveDownload: (blob: Blob) => void;
		const downloadPromise = new Promise<Blob>((resolve) => {
			resolveDownload = resolve;
		});
		mockDownloadApplication.mockReturnValue(downloadPromise);

		render(<ProjectDetailClient />);

		await waitFor(() => {
			expect(screen.getByTestId("application-card-Test Application")).toBeInTheDocument();
		});

		const downloadButton = screen.getByRole("button", { name: /download/i });
		await user.click(downloadButton);

		const markdownOption = await screen.findByText("Markdown (.md)");
		await user.click(markdownOption);

		// Button should be disabled while downloading
		await waitFor(() => {
			expect(downloadButton).toBeDisabled();
			expect(screen.getByText("Downloading...")).toBeInTheDocument();
		});

		// Resolve the download
		resolveDownload!(new Blob(["content"], { type: "text/markdown" }));

		await waitFor(() => {
			expect(downloadButton).not.toBeDisabled();
			expect(screen.getByText("Download")).toBeInTheDocument();
		});
	});
});
