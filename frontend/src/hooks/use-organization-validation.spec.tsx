import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { API } from "@/types/api-types";

vi.mock("@/hooks/use-org-cookie", () => ({
	useOrgCookie: vi.fn(),
}));

vi.mock("@/stores/organization-store", () => ({
	useOrganizationStore: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		info: vi.fn(),
	},
}));

vi.mock("@/utils/logger/client", () => ({
	log: {
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

import { useOrganizationValidation } from "./use-organization-validation";

const mockClearOrganizationCookie = vi.fn();
const mockSetOrganizationCookie = vi.fn();
const mockClearOrganization = vi.fn();
const mockSelectOrganization = vi.fn();
const mockSetOrganizations = vi.fn();

describe("useOrganizationValidation", () => {
	const mockOrganizations: API.ListOrganizations.Http200.ResponseBody = [
		{
			description: null,
			id: "org-1",
			logo_url: null,
			members_count: 1,
			name: "Organization 1",
			projects_count: 0,
			role: "OWNER",
		},
		{
			description: null,
			id: "org-2",
			logo_url: null,
			members_count: 1,
			name: "Organization 2",
			projects_count: 0,
			role: "OWNER",
		},
		{
			description: null,
			id: "org-3",
			logo_url: null,
			members_count: 1,
			name: "Organization 3",
			projects_count: 0,
			role: "OWNER",
		},
	];

	beforeEach(async () => {
		vi.clearAllMocks();

		const { useOrgCookie } = await import("@/hooks/use-org-cookie");
		const { useOrganizationStore } = await import("@/stores/organization-store");
		vi.mocked(useOrgCookie).mockReturnValue({
			clearOrganizationCookie: mockClearOrganizationCookie,
			selectedOrganizationId: null,
			setOrganizationCookie: mockSetOrganizationCookie,
		});

		vi.mocked(useOrganizationStore).mockReturnValue({
			clearOrganization: mockClearOrganization,
			selectedOrganizationId: null,
			selectOrganization: mockSelectOrganization,
			setOrganizations: mockSetOrganizations,
		});
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("Empty organizations handling", () => {
		it("should clear organization state and cookies when organizations array is empty", () => {
			renderHook(() => useOrganizationValidation([]));

			expect(mockSetOrganizations).toHaveBeenCalledWith([]);
			expect(mockClearOrganization).toHaveBeenCalledOnce();
			expect(mockClearOrganizationCookie).toHaveBeenCalledOnce();
		});

		it("should return null when organizations array is empty", () => {
			const { result } = renderHook(() => useOrganizationValidation([]));

			expect(result.current).toBeNull();
		});
	});

	describe("No organization selected scenario", () => {
		it("should select first organization when no organization is selected", () => {
			renderHook(() => useOrganizationValidation(mockOrganizations));

			expect(mockSetOrganizations).toHaveBeenCalledWith(mockOrganizations);
			expect(mockSetOrganizationCookie).toHaveBeenCalledWith("org-1");
			expect(mockSelectOrganization).toHaveBeenCalledWith("org-1");
		});

		it("should return selected organization ID when organizations are available", () => {
			const { result } = renderHook(() => useOrganizationValidation(mockOrganizations));

			expect(result.current).toBeNull();
		});
	});

	describe("Invalid organization ID validation", () => {
		it("should clear invalid cookie and set first available organization", async () => {
			const { useOrgCookie } = await import("@/hooks/use-org-cookie");
			vi.mocked(useOrgCookie).mockReturnValue({
				clearOrganizationCookie: mockClearOrganizationCookie,
				selectedOrganizationId: "invalid-org-id",
				setOrganizationCookie: mockSetOrganizationCookie,
			});

			renderHook(() => useOrganizationValidation(mockOrganizations));

			expect(mockSetOrganizations).toHaveBeenCalledWith(mockOrganizations);
			expect(mockClearOrganizationCookie).toHaveBeenCalledOnce();
			expect(mockSetOrganizationCookie).toHaveBeenCalledWith("org-1");
			expect(mockSelectOrganization).toHaveBeenCalledWith("org-1");
		});

		it("should show toast notification for invalid organization", async () => {
			const { useOrgCookie } = await import("@/hooks/use-org-cookie");
			vi.mocked(useOrgCookie).mockReturnValue({
				clearOrganizationCookie: mockClearOrganizationCookie,
				selectedOrganizationId: "invalid-org-id",
				setOrganizationCookie: mockSetOrganizationCookie,
			});

			renderHook(() => useOrganizationValidation(mockOrganizations));

			const { toast } = await import("sonner");
			expect(vi.mocked(toast.info)).toHaveBeenCalledWith(
				"Organization not found. Switched to available organization.",
			);
		});
	});

	describe("Valid organization ID processing", () => {
		it("should sync store state when organization ID is valid but store state differs", async () => {
			const { useOrgCookie } = await import("@/hooks/use-org-cookie");
			const { useOrganizationStore } = await import("@/stores/organization-store");

			vi.mocked(useOrgCookie).mockReturnValue({
				clearOrganizationCookie: mockClearOrganizationCookie,
				selectedOrganizationId: "org-2",
				setOrganizationCookie: mockSetOrganizationCookie,
			});

			vi.mocked(useOrganizationStore).mockReturnValue({
				clearOrganization: mockClearOrganization,
				selectedOrganizationId: "org-1",
				selectOrganization: mockSelectOrganization,
				setOrganizations: mockSetOrganizations,
			});

			renderHook(() => useOrganizationValidation(mockOrganizations));

			expect(mockSetOrganizations).toHaveBeenCalledWith(mockOrganizations);
			expect(mockSelectOrganization).toHaveBeenCalledWith("org-2");
		});

		it("should not call selectOrganization when store state already matches", async () => {
			const { useOrgCookie } = await import("@/hooks/use-org-cookie");
			const { useOrganizationStore } = await import("@/stores/organization-store");

			vi.mocked(useOrgCookie).mockReturnValue({
				clearOrganizationCookie: mockClearOrganizationCookie,
				selectedOrganizationId: "org-2",
				setOrganizationCookie: mockSetOrganizationCookie,
			});

			vi.mocked(useOrganizationStore).mockReturnValue({
				clearOrganization: mockClearOrganization,
				selectedOrganizationId: "org-2",
				selectOrganization: mockSelectOrganization,
				setOrganizations: mockSetOrganizations,
			});

			renderHook(() => useOrganizationValidation(mockOrganizations));

			expect(mockSetOrganizations).toHaveBeenCalledWith(mockOrganizations);
			expect(mockSelectOrganization).not.toHaveBeenCalled();
		});

		it("should return selected organization ID when valid", async () => {
			const { useOrgCookie } = await import("@/hooks/use-org-cookie");

			vi.mocked(useOrgCookie).mockReturnValue({
				clearOrganizationCookie: mockClearOrganizationCookie,
				selectedOrganizationId: "org-2",
				setOrganizationCookie: mockSetOrganizationCookie,
			});

			const { result } = renderHook(() => useOrganizationValidation(mockOrganizations));

			expect(result.current).toBe("org-2");
		});
	});

	describe("Store state management", () => {
		it("should always call setOrganizations with provided organizations array", () => {
			renderHook(() => useOrganizationValidation(mockOrganizations));

			expect(mockSetOrganizations).toHaveBeenCalledWith(mockOrganizations);
		});

		it("should handle organizations array changes", () => {
			const { rerender } = renderHook(({ organizations }) => useOrganizationValidation(organizations), {
				initialProps: { organizations: mockOrganizations },
			});

			expect(mockSetOrganizations).toHaveBeenCalledWith(mockOrganizations);

			const newOrganizations: API.ListOrganizations.Http200.ResponseBody = [
				{
					description: null,
					id: "new-org-1",
					logo_url: null,
					members_count: 1,
					name: "New Organization 1",
					projects_count: 0,
					role: "OWNER",
				},
				{
					description: null,
					id: "new-org-2",
					logo_url: null,
					members_count: 1,
					name: "New Organization 2",
					projects_count: 0,
					role: "OWNER",
				},
			];

			rerender({ organizations: newOrganizations });

			expect(mockSetOrganizations).toHaveBeenCalledWith(newOrganizations);
		});
	});

	describe("Return value behavior", () => {
		it("should return null when organizations array is empty", () => {
			const { result } = renderHook(() => useOrganizationValidation([]));

			expect(result.current).toBeNull();
		});

		it("should return selectedOrganizationId when organizations array has items", async () => {
			const { useOrgCookie } = await import("@/hooks/use-org-cookie");

			vi.mocked(useOrgCookie).mockReturnValue({
				clearOrganizationCookie: mockClearOrganizationCookie,
				selectedOrganizationId: "org-3",
				setOrganizationCookie: mockSetOrganizationCookie,
			});

			const { result } = renderHook(() => useOrganizationValidation(mockOrganizations));

			expect(result.current).toBe("org-3");
		});
	});

	describe("Integration scenarios", () => {
		it("should handle complete flow for new user with organizations", async () => {
			const { useOrgCookie } = await import("@/hooks/use-org-cookie");
			const { useOrganizationStore } = await import("@/stores/organization-store");

			vi.mocked(useOrgCookie).mockReturnValue({
				clearOrganizationCookie: mockClearOrganizationCookie,
				selectedOrganizationId: null,
				setOrganizationCookie: mockSetOrganizationCookie,
			});

			vi.mocked(useOrganizationStore).mockReturnValue({
				clearOrganization: mockClearOrganization,
				selectedOrganizationId: null,
				selectOrganization: mockSelectOrganization,
				setOrganizations: mockSetOrganizations,
			});

			renderHook(() => useOrganizationValidation(mockOrganizations));

			expect(mockSetOrganizations).toHaveBeenCalledWith(mockOrganizations);
			expect(mockSetOrganizationCookie).toHaveBeenCalledWith("org-1");
			expect(mockSelectOrganization).toHaveBeenCalledWith("org-1");
			expect(mockClearOrganizationCookie).not.toHaveBeenCalled();
			expect(mockClearOrganization).not.toHaveBeenCalled();
		});

		it("should handle user with no organizations available", async () => {
			const { useOrgCookie } = await import("@/hooks/use-org-cookie");

			vi.mocked(useOrgCookie).mockReturnValue({
				clearOrganizationCookie: mockClearOrganizationCookie,
				selectedOrganizationId: "some-org-id",
				setOrganizationCookie: mockSetOrganizationCookie,
			});

			renderHook(() => useOrganizationValidation([]));

			expect(mockSetOrganizations).toHaveBeenCalledWith([]);
			expect(mockClearOrganization).toHaveBeenCalledOnce();
			expect(mockClearOrganizationCookie).toHaveBeenCalledOnce();
			expect(mockSetOrganizationCookie).not.toHaveBeenCalled();
			expect(mockSelectOrganization).not.toHaveBeenCalled();
		});
	});
});
