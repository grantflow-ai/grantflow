import { ApplicationFactory, ProjectFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as grantApplicationActions from "@/actions/grant-applications";
import { APPLICATION_STATUS } from "@/constants/download";
import { ProjectDetailClient } from "./project-detail-client";

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

vi.mock("@/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
	DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dropdown-content">{children}</div>
	),
	DropdownMenuItem: ({ children, onClick }: any) => (
		<div
			data-testid="dropdown-item"
			onClick={onClick}
			onKeyDown={(e: React.KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick?.(e);
				}
			}}
			role="menuitem"
			tabIndex={0}
		>
			{children}
		</div>
	),
	DropdownMenuTrigger: ({ children, className, disabled, onClick }: any) => (
		<button className={className} disabled={disabled} onClick={onClick} type="button">
			{children}
		</button>
	),
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

const setupAnchorSpies = () => {
	const clickSpy = vi.fn();
	const removeSpy = vi.fn();
	let anchor: HTMLAnchorElement | null = null;
	const appendSpy = vi.spyOn(document.body, "append").mockImplementation((...nodes: (Node | string)[]) => {
		const [node] = nodes;
		if (node instanceof Node) {
			anchor = node as HTMLAnchorElement;
			anchor.click = clickSpy as typeof anchor.click;
			anchor.remove = removeSpy as typeof anchor.remove;
		}
	});

	return {
		get anchor() {
			return anchor;
		},
		clickSpy,
		removeSpy,
		restore: () => appendSpy.mockRestore(),
	};
};

describe("ProjectDetailClient Download Functionality", () => {
	beforeEach(async () => {
		vi.clearAllMocks();

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
			expect(screen.getByTestId("application-card-app-123")).toBeInTheDocument();

			const draftCard = screen.getByTestId("application-card-app-456");
			expect(draftCard).toBeInTheDocument();
		});
	});

	it("successfully downloads application in markdown format", async () => {
		const user = userEvent.setup();
		const mockBlob = new Blob(["# Test Application\\n\\nContent"], { type: "text/markdown" });
		mockDownloadApplication.mockResolvedValue(mockBlob);

		const originalCreateObjectURL = globalThis.URL.createObjectURL;
		const originalRevokeObjectURL = globalThis.URL.revokeObjectURL;
		const mockCreateObjectURL = vi.fn(() => "blob:test-url");
		const mockRevokeObjectURL = vi.fn();
		globalThis.URL.createObjectURL = mockCreateObjectURL;
		globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

		const anchorControl = setupAnchorSpies();

		render(<ProjectDetailClient />);

		await waitFor(() => {
			expect(screen.getByTestId("application-card-app-123")).toBeInTheDocument();
		});

		const downloadMenus = screen.getAllByTestId("dropdown-menu");
		const downloadButton = downloadMenus[0].querySelector("button[type='button']");
		expect(downloadButton).toBeInTheDocument();
		await user.click(downloadButton!);

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

		const link = anchorControl.anchor;
		expect(link).not.toBeNull();
		expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
		expect(link?.href).toBe("blob:test-url");
		expect(link?.download).toBe("Test_Application.md");
		expect(anchorControl.clickSpy).toHaveBeenCalled();
		expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");

		anchorControl.restore();
		globalThis.URL.createObjectURL = originalCreateObjectURL;
		globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
	});

	it("successfully downloads application in PDF format", async () => {
		const user = userEvent.setup();
		const mockBlob = new Blob([new ArrayBuffer(1024)], { type: "application/pdf" });
		mockDownloadApplication.mockResolvedValue(mockBlob);

		const originalCreateObjectURL = globalThis.URL.createObjectURL;
		const originalRevokeObjectURL = globalThis.URL.revokeObjectURL;
		const mockCreateObjectURL = vi.fn(() => "blob:test-pdf-url");
		const mockRevokeObjectURL = vi.fn();
		globalThis.URL.createObjectURL = mockCreateObjectURL;
		globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

		const anchorControl = setupAnchorSpies();

		render(<ProjectDetailClient />);

		await waitFor(() => {
			expect(screen.getByTestId("application-card-app-123")).toBeInTheDocument();
		});

		const downloadMenus = screen.getAllByTestId("dropdown-menu");
		const downloadButton = downloadMenus[0].querySelector("button[type='button']");
		expect(downloadButton).toBeInTheDocument();
		await user.click(downloadButton!);

		const pdfOption = await screen.findByText("PDF (.pdf)");
		await user.click(pdfOption);

		await waitFor(() => {
			expect(mockDownloadApplication).toHaveBeenCalledWith("org-123", expect.any(String), "app-123", "pdf");
			expect(anchorControl.anchor?.download).toBe("Test_Application.pdf");
		});

		anchorControl.restore();
		globalThis.URL.createObjectURL = originalCreateObjectURL;
		globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
	});

	it("handles download errors gracefully", async () => {
		const user = userEvent.setup();
		const mockError = new Error("Download failed");
		mockDownloadApplication.mockRejectedValue(mockError);

		render(<ProjectDetailClient />);

		await waitFor(() => {
			expect(screen.getByTestId("application-card-app-123")).toBeInTheDocument();
		});

		const downloadMenus = screen.getAllByTestId("dropdown-menu");
		const downloadButton = downloadMenus[0].querySelector("button[type='button']");
		expect(downloadButton).toBeInTheDocument();
		await user.click(downloadButton!);

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

		const originalCreateObjectURL = globalThis.URL.createObjectURL;
		const originalRevokeObjectURL = globalThis.URL.revokeObjectURL;
		globalThis.URL.createObjectURL = vi.fn(() => "blob:test-url");
		globalThis.URL.revokeObjectURL = vi.fn();

		const anchorControl = setupAnchorSpies();

		render(<ProjectDetailClient />);

		await waitFor(() => {
			expect(screen.getByTestId("application-card-app-special")).toBeInTheDocument();
		});

		const downloadMenus = screen.getAllByTestId("dropdown-menu");
		const downloadButton = downloadMenus[0].querySelector("button[type='button']");
		expect(downloadButton).toBeInTheDocument();
		await user.click(downloadButton!);

		const markdownOption = await screen.findByText("Markdown (.md)");
		await user.click(markdownOption);

		await waitFor(() => {
			expect(anchorControl.anchor?.download).toBe("Test__App___With___Special___Characters___.md");
		});

		anchorControl.restore();
		globalThis.URL.createObjectURL = originalCreateObjectURL;
		globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
	});

	it("manages loading state correctly", async () => {
		const user = userEvent.setup();

		let resolveDownload: (blob: Blob) => void;
		const downloadPromise = new Promise<Blob>((resolve) => {
			resolveDownload = resolve;
		});
		mockDownloadApplication.mockReturnValue(downloadPromise);

		render(<ProjectDetailClient />);

		await waitFor(() => {
			expect(screen.getByTestId("application-card-app-123")).toBeInTheDocument();
		});

		const downloadMenus = screen.getAllByTestId("dropdown-menu");
		const downloadButton = downloadMenus[0].querySelector("button[type='button']");
		expect(downloadButton).toBeInTheDocument();
		await user.click(downloadButton!);

		const markdownOption = await screen.findByText("Markdown (.md)");
		await user.click(markdownOption);

		await waitFor(() => {
			expect(downloadButton).toBeDisabled();
			const svgIcon = downloadButton!.querySelector("svg");
			expect(svgIcon).toBeInTheDocument();
			expect(svgIcon).toHaveClass("animate-spin");
		});

		resolveDownload!(new Blob(["content"], { type: "text/markdown" }));

		await waitFor(() => {
			expect(downloadButton).not.toBeDisabled();
			const downloadIcon = downloadButton!.querySelector("svg");
			expect(downloadIcon).toBeInTheDocument();
		});
	});
});
