import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { resetAllStores } from "::testing/store-reset";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGrantingInstitution } from "@/actions/granting-institutions";
import type { API } from "@/types/api-types";

import { useAdminStore } from "./admin-store";

const createMockInstitution = (): API.GetGrantingInstitution.Http200.ResponseBody => ({
	abbreviation: "NIH",
	created_at: "2024-01-01T00:00:00Z",
	full_name: "National Institutes of Health",
	id: "institution-123",
	source_count: 0,
	updated_at: "2024-01-01T00:00:00Z",
});

const { toastErrorMock } = vi.hoisted(() => {
	return {
		toastErrorMock: vi.fn(),
	};
});

vi.mock("@/actions/granting-institutions", () => ({
	getGrantingInstitution: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		error: toastErrorMock,
		success: vi.fn(),
	},
}));

vi.mock("@/utils/logger/client", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
	},
}));

describe("Admin Store", () => {
	beforeEach(() => {
		resetAllStores();
		setupAuthenticatedTest();

		vi.clearAllMocks();
		vi.resetAllMocks();

		vi.mocked(getGrantingInstitution).mockReset();
	});

	describe("state management", () => {
		it("should initialize with default state", () => {
			const state = useAdminStore.getState();
			expect(state.grantingInstitution).toBeNull();
			expect(state.isLoading).toBe(false);
			expect(state.selectedGrantingInstitutionId).toBeNull();
		});
	});

	describe("selectGrantingInstitution", () => {
		it("should set selected institution ID", () => {
			const { selectGrantingInstitution } = useAdminStore.getState();

			selectGrantingInstitution("institution-456");

			const state = useAdminStore.getState();
			expect(state.selectedGrantingInstitutionId).toBe("institution-456");
		});

		it("should not update if ID is already selected", () => {
			const { selectGrantingInstitution } = useAdminStore.getState();

			selectGrantingInstitution("institution-456");
			const state1 = useAdminStore.getState();

			selectGrantingInstitution("institution-456");
			const state2 = useAdminStore.getState();

			expect(state1.selectedGrantingInstitutionId).toBe(state2.selectedGrantingInstitutionId);
		});

		it("should update if different ID is selected", () => {
			const { selectGrantingInstitution } = useAdminStore.getState();

			selectGrantingInstitution("institution-456");
			expect(useAdminStore.getState().selectedGrantingInstitutionId).toBe("institution-456");

			selectGrantingInstitution("institution-789");
			expect(useAdminStore.getState().selectedGrantingInstitutionId).toBe("institution-789");
		});
	});

	describe("getGrantingInstitution", () => {
		it("should load institution successfully", async () => {
			const institution = createMockInstitution();

			vi.mocked(getGrantingInstitution).mockResolvedValue(institution);

			const { getGrantingInstitution: loadInstitution } = useAdminStore.getState();

			await loadInstitution("institution-123");

			expect(getGrantingInstitution).toHaveBeenCalledWith("institution-123");

			const state = useAdminStore.getState();
			expect(state.grantingInstitution).toEqual(institution);
			expect(state.isLoading).toBe(false);
		});

		it("should handle API errors gracefully", async () => {
			vi.mocked(getGrantingInstitution).mockRejectedValue(new Error("API Error"));

			const { getGrantingInstitution: loadInstitution } = useAdminStore.getState();

			await loadInstitution("institution-123");

			expect(toastErrorMock).toHaveBeenCalledWith("Failed to retrieve granting institution");
			const state = useAdminStore.getState();
			expect(state.isLoading).toBe(false);
		});

		it("should set loading state during API call", async () => {
			const institution = createMockInstitution();

			vi.mocked(getGrantingInstitution).mockImplementation(
				() =>
					new Promise((resolve) => {
						setTimeout(() => resolve(institution), 100);
					}),
			);

			const { getGrantingInstitution: loadInstitution } = useAdminStore.getState();

			const loadPromise = loadInstitution("institution-123");

			expect(useAdminStore.getState().isLoading).toBe(true);

			await loadPromise;

			expect(useAdminStore.getState().isLoading).toBe(false);
		});
	});

	describe("setGrantingInstitution", () => {
		it("should set institution directly", () => {
			const institution = createMockInstitution();

			const { setGrantingInstitution } = useAdminStore.getState();

			setGrantingInstitution(institution);

			const state = useAdminStore.getState();
			expect(state.grantingInstitution).toEqual(institution);
		});

		it("should overwrite existing institution", () => {
			const institution1 = createMockInstitution();
			const institution2 = { ...createMockInstitution(), full_name: "NSF", id: "institution-999" };

			const { setGrantingInstitution } = useAdminStore.getState();

			setGrantingInstitution(institution1);
			expect(useAdminStore.getState().grantingInstitution?.id).toBe("institution-123");

			setGrantingInstitution(institution2);
			expect(useAdminStore.getState().grantingInstitution?.id).toBe("institution-999");
		});
	});

	describe("clearSelection", () => {
		it("should clear all selection state", () => {
			const institution = createMockInstitution();

			useAdminStore.setState({
				grantingInstitution: institution,
				selectedGrantingInstitutionId: "institution-123",
			});

			const { clearSelection } = useAdminStore.getState();
			clearSelection();

			const state = useAdminStore.getState();
			expect(state.grantingInstitution).toBeNull();
			expect(state.selectedGrantingInstitutionId).toBeNull();
		});

		it("should handle clearing when already empty", () => {
			const { clearSelection } = useAdminStore.getState();

			clearSelection();

			const state = useAdminStore.getState();
			expect(state.grantingInstitution).toBeNull();
			expect(state.selectedGrantingInstitutionId).toBeNull();
		});
	});

	describe("persistence", () => {
		it("should persist selectedGrantingInstitutionId", () => {
			const { selectGrantingInstitution } = useAdminStore.getState();

			selectGrantingInstitution("institution-123");

			const state = useAdminStore.getState();
			expect(state.selectedGrantingInstitutionId).toBe("institution-123");
		});
	});

	describe("integration scenarios", () => {
		it("should handle select -> load -> clear workflow", async () => {
			const institution = createMockInstitution();

			vi.mocked(getGrantingInstitution).mockResolvedValue(institution);

			const {
				clearSelection,
				getGrantingInstitution: loadInstitution,
				selectGrantingInstitution,
			} = useAdminStore.getState();

			selectGrantingInstitution("institution-123");
			expect(useAdminStore.getState().selectedGrantingInstitutionId).toBe("institution-123");

			await loadInstitution("institution-123");
			expect(useAdminStore.getState().grantingInstitution).toEqual(institution);

			clearSelection();
			expect(useAdminStore.getState().selectedGrantingInstitutionId).toBeNull();
			expect(useAdminStore.getState().grantingInstitution).toBeNull();
		});

		it("should handle switching between institutions", async () => {
			const institution1 = createMockInstitution();
			const institution2 = { ...createMockInstitution(), full_name: "NSF", id: "institution-999" };

			const { getGrantingInstitution: loadInstitution, selectGrantingInstitution } = useAdminStore.getState();

			vi.mocked(getGrantingInstitution).mockResolvedValue(institution1);
			selectGrantingInstitution("institution-123");
			await loadInstitution("institution-123");
			expect(useAdminStore.getState().grantingInstitution?.full_name).toBe("National Institutes of Health");

			vi.mocked(getGrantingInstitution).mockResolvedValue(institution2);
			selectGrantingInstitution("institution-999");
			await loadInstitution("institution-999");
			expect(useAdminStore.getState().grantingInstitution?.full_name).toBe("NSF");
		});
	});
});
