import { ApplicationFactory, GrantTemplateFactory, RagSourceFactory } from "::testing/factories";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getApplication } from "@/actions/grant-applications";
import { SourceIndexingStatus } from "@/enums";
import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";

vi.mock("@/actions/grant-applications");

const mockGetApplication = vi.mocked(getApplication);

describe("useWaitForSourcesReady", () => {
	const mockApplicationId = "test-app-id";
	const mockOrganizationId = "test-org-id";
	const mockProjectId = "test-project-id";

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		// Setup stores
		useOrganizationStore.setState({ selectedOrganizationId: mockOrganizationId });
		useApplicationStore.setState({
			application: ApplicationFactory.build({
				id: mockApplicationId,
				project_id: mockProjectId,
			}),
		});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.resetAllMocks();
	});

	it("should return isWaiting as false initially", async () => {
		const { useWaitForSourcesReady } = await import("./use-wait-for-sources-ready");

		const { result } = renderHook(() =>
			useWaitForSourcesReady({
				applicationId: mockApplicationId,
			}),
		);

		expect(result.current.isWaiting).toBe(false);
	});

	it("should return immediately when no source IDs are provided", async () => {
		const { useWaitForSourcesReady } = await import("./use-wait-for-sources-ready");

		const { result } = renderHook(() =>
			useWaitForSourcesReady({
				applicationId: mockApplicationId,
			}),
		);

		await act(async () => {
			await result.current.waitForSources([]);
		});

		expect(mockGetApplication).not.toHaveBeenCalled();
		expect(result.current.isWaiting).toBe(false);
	});

	it("should throw error when organization or application is not found", async () => {
		const { useWaitForSourcesReady } = await import("./use-wait-for-sources-ready");

		useOrganizationStore.setState({});

		const { result } = renderHook(() =>
			useWaitForSourcesReady({
				applicationId: mockApplicationId,
			}),
		);

		await expect(async () => {
			await act(async () => {
				await result.current.waitForSources(["source-1"]);
			});
		}).rejects.toThrow("Organization or application not found");
	});

	it("should poll and return when all sources are no longer PENDING_UPLOAD", async () => {
		const { useWaitForSourcesReady } = await import("./use-wait-for-sources-ready");

		const sourceId1 = "source-1";
		const sourceId2 = "source-2";

		// First poll: sources are PENDING_UPLOAD
		mockGetApplication.mockResolvedValueOnce(
			ApplicationFactory.build({
				id: mockApplicationId,
				project_id: mockProjectId,
				rag_sources: [
					RagSourceFactory.build({ sourceId: sourceId1, status: SourceIndexingStatus.PENDING_UPLOAD }),
					RagSourceFactory.build({ sourceId: sourceId2, status: SourceIndexingStatus.PENDING_UPLOAD }),
				],
			}),
		);

		// Second poll: sources are CREATED
		mockGetApplication.mockResolvedValueOnce(
			ApplicationFactory.build({
				id: mockApplicationId,
				project_id: mockProjectId,
				rag_sources: [
					RagSourceFactory.build({ sourceId: sourceId1, status: SourceIndexingStatus.CREATED }),
					RagSourceFactory.build({ sourceId: sourceId2, status: SourceIndexingStatus.CREATED }),
				],
			}),
		);

		const { result } = renderHook(() =>
			useWaitForSourcesReady({
				applicationId: mockApplicationId,
			}),
		);

		await act(async () => {
			const waitPromise = result.current.waitForSources([sourceId1, sourceId2]);

			// Fast-forward through first poll
			await vi.advanceTimersByTimeAsync(1000);

			// Fast-forward through second poll
			await vi.advanceTimersByTimeAsync(1000);

			await waitPromise;
		});

		expect(mockGetApplication).toHaveBeenCalledTimes(2);
		expect(result.current.isWaiting).toBe(false);
	});

	it("should throw error when sources fail processing", async () => {
		const { useWaitForSourcesReady } = await import("./use-wait-for-sources-ready");

		const sourceId = "source-1";

		mockGetApplication.mockResolvedValueOnce(
			ApplicationFactory.build({
				id: mockApplicationId,
				project_id: mockProjectId,
				rag_sources: [RagSourceFactory.build({ sourceId, status: SourceIndexingStatus.FAILED })],
			}),
		);

		const { result } = renderHook(() =>
			useWaitForSourcesReady({
				applicationId: mockApplicationId,
			}),
		);

		await expect(async () => {
			await act(async () => {
				await result.current.waitForSources([sourceId]);
			});
		}).rejects.toThrow(`Source processing failed for: ${sourceId}`);

		expect(result.current.isWaiting).toBe(false);
	});

	it("should throw error when timeout is reached", async () => {
		const { useWaitForSourcesReady } = await import("./use-wait-for-sources-ready");

		const sourceId = "source-1";

		// Always return PENDING_UPLOAD
		mockGetApplication.mockResolvedValue(
			ApplicationFactory.build({
				id: mockApplicationId,
				project_id: mockProjectId,
				rag_sources: [RagSourceFactory.build({ sourceId, status: SourceIndexingStatus.PENDING_UPLOAD })],
			}),
		);

		const { result } = renderHook(() =>
			useWaitForSourcesReady({
				applicationId: mockApplicationId,
			}),
		);

		let error: Error | undefined;

		const waitPromise = act(async () => {
			try {
				await result.current.waitForSources([sourceId]);
			} catch (e) {
				error = e as Error;
			}
		});

		// Fast-forward past the 30 second timeout
		await act(async () => {
			await vi.advanceTimersByTimeAsync(31_000);
		});

		await waitPromise;

		expect(error).toBeDefined();
		expect(error?.message).toBe("Timeout waiting for sources to be ready");
		expect(result.current.isWaiting).toBe(false);
	});

	it("should handle sources in grant_template.rag_sources", async () => {
		const { useWaitForSourcesReady } = await import("./use-wait-for-sources-ready");

		const sourceId = "template-source-1";

		// Source is in template rag_sources and is CREATED (ready)
		mockGetApplication.mockResolvedValueOnce(
			ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					id: "template-id",
					rag_sources: [RagSourceFactory.build({ sourceId, status: SourceIndexingStatus.CREATED })],
				}),
				id: mockApplicationId,
				project_id: mockProjectId,
				rag_sources: [],
			}),
		);

		const { result } = renderHook(() =>
			useWaitForSourcesReady({
				applicationId: mockApplicationId,
			}),
		);

		await act(async () => {
			await result.current.waitForSources([sourceId]);
		});

		expect(mockGetApplication).toHaveBeenCalledTimes(1);
		expect(result.current.isWaiting).toBe(false);
	});

	it("should wait and poll when sources are not found initially", async () => {
		const { useWaitForSourcesReady } = await import("./use-wait-for-sources-ready");

		const sourceId = "source-1";

		// First poll: no sources yet
		mockGetApplication.mockResolvedValueOnce(
			ApplicationFactory.build({
				id: mockApplicationId,
				project_id: mockProjectId,
				rag_sources: [],
			}),
		);

		// Second poll: source appears and is ready
		mockGetApplication.mockResolvedValueOnce(
			ApplicationFactory.build({
				id: mockApplicationId,
				project_id: mockProjectId,
				rag_sources: [RagSourceFactory.build({ sourceId, status: SourceIndexingStatus.CREATED })],
			}),
		);

		const { result } = renderHook(() =>
			useWaitForSourcesReady({
				applicationId: mockApplicationId,
			}),
		);

		await act(async () => {
			const waitPromise = result.current.waitForSources([sourceId]);

			// Fast-forward through polls
			await vi.advanceTimersByTimeAsync(1000);
			await vi.advanceTimersByTimeAsync(1000);

			await waitPromise;
		});

		expect(mockGetApplication).toHaveBeenCalledTimes(2);
		expect(result.current.isWaiting).toBe(false);
	});

	it("should accept sources in FINISHED status as ready", async () => {
		const { useWaitForSourcesReady } = await import("./use-wait-for-sources-ready");

		const sourceId = "source-1";

		mockGetApplication.mockResolvedValueOnce(
			ApplicationFactory.build({
				id: mockApplicationId,
				project_id: mockProjectId,
				rag_sources: [RagSourceFactory.build({ sourceId, status: SourceIndexingStatus.FINISHED })],
			}),
		);

		const { result } = renderHook(() =>
			useWaitForSourcesReady({
				applicationId: mockApplicationId,
			}),
		);

		await act(async () => {
			await result.current.waitForSources([sourceId]);
		});

		expect(mockGetApplication).toHaveBeenCalledTimes(1);
		expect(result.current.isWaiting).toBe(false);
	});
});
