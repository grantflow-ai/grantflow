import { render, screen } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { acceptInvitation } from "@/actions/project";
import { useUserStore } from "@/stores/user-store";
import AcceptInvitationPage from "./page";

// Mock dependencies
vi.mock("next/navigation");
vi.mock("@/actions/project");
vi.mock("@/stores/user-store");
vi.mock("@/utils/logger", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
	},
}));

const mockPush = vi.fn();
const mockGet = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();

	(useRouter as any).mockReturnValue({
		push: mockPush,
	});

	(useSearchParams as any).mockReturnValue({
		get: mockGet,
	});

	(useUserStore as any).mockReturnValue({
		isAuthenticated: true,
	});
});

describe("AcceptInvitationPage", () => {
	it("should show loading spinner initially", () => {
		mockGet.mockReturnValue("valid.jwt.token");

		render(<AcceptInvitationPage />);

		expect(screen.getByText("Processing your invitation...")).toBeInTheDocument();
		expect(screen.getByTestId("processing-spinner")).toBeInTheDocument();
	});

	it("should redirect to projects with error when no token provided", () => {
		mockGet.mockReturnValue(null);

		render(<AcceptInvitationPage />);

		expect(mockPush).toHaveBeenCalledWith("/projects?error=invalid-invitation");
	});

	it("should redirect to login when user is not authenticated", () => {
		mockGet.mockReturnValue("valid.jwt.token");
		(useUserStore as any).mockReturnValue({
			isAuthenticated: false,
		});

		render(<AcceptInvitationPage />);

		expect(mockPush).toHaveBeenCalledWith("/login?returnUrl=%2Faccept-invitation%3Ftoken%3Dvalid.jwt.token");
	});

	it("should process invitation and redirect to project on success", async () => {
		// Mock JWT token with invitation_id
		const mockToken = btoa(JSON.stringify({ invitation_id: "inv-123" }));
		const fullToken = `header.${mockToken}.signature`;
		mockGet.mockReturnValue(fullToken);

		// Mock successful invitation acceptance
		const mockResultToken = btoa(JSON.stringify({ project_id: "proj-456" }));
		const fullResultToken = `header.${mockResultToken}.signature`;
		(acceptInvitation as any).mockResolvedValue({
			token: fullResultToken,
		});

		render(<AcceptInvitationPage />);

		// Wait for async operations
		await vi.waitFor(() => {
			expect(acceptInvitation).toHaveBeenCalledWith("inv-123");
		});

		await vi.waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith("/projects/proj-456?success=invitation-accepted");
		});
	});

	it("should redirect to projects with error on invitation failure", async () => {
		const mockToken = btoa(JSON.stringify({ invitation_id: "inv-123" }));
		const fullToken = `header.${mockToken}.signature`;
		mockGet.mockReturnValue(fullToken);

		(acceptInvitation as any).mockRejectedValue(new Error("Failed to accept"));

		render(<AcceptInvitationPage />);

		await vi.waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith("/projects?error=invitation-failed");
		});
	});

	it("should handle invalid token format", async () => {
		const mockToken = btoa(JSON.stringify({})); // Missing invitation_id
		const fullToken = `header.${mockToken}.signature`;
		mockGet.mockReturnValue(fullToken);

		render(<AcceptInvitationPage />);

		await vi.waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith("/projects?error=invitation-failed");
		});
	});
});
