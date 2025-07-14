import { ApplicationFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApplication } from "@/actions/grant-applications";
import { DEFAULT_APPLICATION_TITLE } from "@/constants";
import { resolveProjectSlug } from "@/utils/slug-resolver";
import NewApplicationPage from "./page";

vi.mock("next/navigation", () => ({
	useParams: vi.fn(),
	useRouter: vi.fn(),
}));

vi.mock("@/actions/grant-applications", () => ({
	createApplication: vi.fn(),
}));

vi.mock("@/utils/slug-resolver", () => ({
	resolveProjectSlug: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
	},
}));

describe("NewApplicationPage", () => {
	const mockRouter = {
		replace: vi.fn(),
	};
	const mockProjectId = "test-project-id";
	const mockProjectSlug = "test-project-slug";

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useRouter).mockReturnValue(mockRouter as any);
		vi.mocked(useParams).mockReturnValue({ projectId: mockProjectSlug });
		vi.mocked(resolveProjectSlug).mockResolvedValue(mockProjectId);
	});

	it("creates application and redirects to wizard", async () => {
		const mockApplication = ApplicationFactory.build({
			id: "test-app-id",
			title: DEFAULT_APPLICATION_TITLE,
		});
		vi.mocked(createApplication).mockResolvedValue(mockApplication);

		render(<NewApplicationPage />);

		expect(screen.getByText("Creating Application")).toBeInTheDocument();
		expect(screen.getByText("Please wait while we set up your new application...")).toBeInTheDocument();

		await waitFor(() => {
			expect(resolveProjectSlug).toHaveBeenCalledWith(mockProjectSlug);
			expect(createApplication).toHaveBeenCalledWith(mockProjectId, {
				title: DEFAULT_APPLICATION_TITLE,
			});
			expect(mockRouter.replace).toHaveBeenCalledWith(expect.stringContaining("/wizard"));
		});
	});

	it("shows error when project not found", async () => {
		vi.mocked(resolveProjectSlug).mockResolvedValue(null);

		render(<NewApplicationPage />);

		await waitFor(() => {
			expect(screen.getByText("Error")).toBeInTheDocument();
			expect(screen.getByText("Project not found")).toBeInTheDocument();
		});

		expect(createApplication).not.toHaveBeenCalled();
	});

	it("shows error when application creation fails", async () => {
		const error = new Error("API Error");
		vi.mocked(createApplication).mockRejectedValue(error);

		render(<NewApplicationPage />);

		await waitFor(() => {
			expect(screen.getByText("Error")).toBeInTheDocument();
			expect(screen.getByText("Failed to create application")).toBeInTheDocument();
			expect(toast.error).toHaveBeenCalledWith("Failed to create application");
		});
	});

	it("prevents duplicate creation attempts", async () => {
		const mockApplication = ApplicationFactory.build();
		vi.mocked(createApplication).mockImplementation(
			() => new Promise((resolve) => setTimeout(() => resolve(mockApplication), 100)),
		);

		const { rerender } = render(<NewApplicationPage />);

		// Trigger multiple renders
		rerender(<NewApplicationPage />);
		rerender(<NewApplicationPage />);

		await waitFor(() => {
			expect(createApplication).toHaveBeenCalledTimes(1);
		});
	});
});
