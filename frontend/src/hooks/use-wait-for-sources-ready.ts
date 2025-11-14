import { useCallback, useRef, useState } from "react";
import { getApplication } from "@/actions/grant-applications";
import { SourceIndexingStatus } from "@/enums";
import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger/client";

const POLL_INTERVAL_MS = 1000;
const TIMEOUT_MS = 30_000;

interface UseWaitForSourcesReadyOptions {
	/**
	 * Application ID to poll for sources
	 */
	applicationId: string;
}

interface UseWaitForSourcesReadyReturn {
	/**
	 * Whether the hook is currently waiting for sources
	 */
	isWaiting: boolean;

	/**
	 * Wait for all sources to transition from PENDING_UPLOAD status.
	 * Polls the application endpoint until all sources are ready or timeout occurs.
	 * @param sourceIds - Array of source IDs to wait for
	 * @throws Error if timeout occurs or sources fail
	 */
	waitForSources: (sourceIds: string[]) => Promise<void>;
}

/**
 * Hook to poll for RAG sources to transition from PENDING_UPLOAD status.
 * Used before triggering RAG generation to ensure all files are uploaded to GCS.
 *
 * @example
 * ```tsx
 * const { waitForSources, isWaiting } = useWaitForSourcesReady({ applicationId });
 *
 * const handleUpload = async (files: File[]) => {
 *   const uploadResults = await uploadFiles(files);
 *   const sourceIds = uploadResults.map(r => r.sourceId);
 *   await waitForSources(sourceIds); // Wait for sources to be ready
 *   await triggerRAGGeneration(); // Then start RAG
 * };
 * ```
 */
export function useWaitForSourcesReady({ applicationId }: UseWaitForSourcesReadyOptions): UseWaitForSourcesReadyReturn {
	const [isWaiting, setIsWaiting] = useState(false);
	const abortControllerRef = useRef<AbortController | null>(null);

	const waitForSources = useCallback(
		async (sourceIds: string[]): Promise<void> => {
			if (sourceIds.length === 0) {
				log.info("[useWaitForSourcesReady] No sources to wait for");
				return;
			}

			const { selectedOrganizationId } = useOrganizationStore.getState();
			const { application } = useApplicationStore.getState();

			if (!(selectedOrganizationId && application)) {
				throw new Error("Organization or application not found");
			}

			abortControllerRef.current = new AbortController();
			setIsWaiting(true);

			const startTime = Date.now();
			const sourceIdsSet = new Set(sourceIds);

			log.info("[useWaitForSourcesReady] Starting to wait for sources", {
				applicationId,
				sourceCount: sourceIds.length,
				sourceIds,
			});

			try {
				while (Date.now() - startTime < TIMEOUT_MS) {
					if (abortControllerRef.current.signal.aborted) {
						throw new Error("Wait for sources aborted");
					}

					// Fetch latest application data
					const updatedApplication = await getApplication(
						selectedOrganizationId,
						application.project_id,
						applicationId,
					);

					// Get all RAG sources (template + application sources)
					const allSources: API.RetrieveApplication.Http200.ResponseBody["rag_sources"] = [
						...updatedApplication.rag_sources,
						...(updatedApplication.grant_template?.rag_sources ?? []),
					];

					// Find sources we're waiting for
					const relevantSources = allSources.filter((source) => sourceIdsSet.has(source.sourceId));

					if (relevantSources.length === 0) {
						log.warn("[useWaitForSourcesReady] No matching sources found yet", {
							applicationId,
							expectedSourceIds: sourceIds,
						});
						await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
						continue;
					}

					// Check if any sources have failed
					const failedSources = relevantSources.filter(
						(source) => source.status === SourceIndexingStatus.FAILED,
					);

					if (failedSources.length > 0) {
						const failedIds = failedSources.map((s) => s.sourceId);
						log.error("[useWaitForSourcesReady] Sources failed processing", {
							applicationId,
							failedSourceIds: failedIds,
						});
						throw new Error(`Source processing failed for: ${failedIds.join(", ")}`);
					}

					// Check if all sources are no longer PENDING_UPLOAD
					const pendingSources = relevantSources.filter(
						(source) => source.status === SourceIndexingStatus.PENDING_UPLOAD,
					);

					if (pendingSources.length === 0) {
						log.info("[useWaitForSourcesReady] All sources ready", {
							applicationId,
							sourceCount: relevantSources.length,
							statuses: relevantSources.map((s) => ({ id: s.sourceId, status: s.status })),
						});
						return;
					}

					log.info("[useWaitForSourcesReady] Still waiting for sources", {
						applicationId,
						pendingCount: pendingSources.length,
						totalCount: relevantSources.length,
					});

					// Wait before next poll
					await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
				}

				// Timeout reached
				log.error("[useWaitForSourcesReady] Timeout waiting for sources", {
					applicationId,
					sourceIds,
					timeoutMs: TIMEOUT_MS,
				});
				throw new Error("Timeout waiting for sources to be ready");
			} finally {
				setIsWaiting(false);
				abortControllerRef.current = null;
			}
		},
		[applicationId],
	);

	return {
		isWaiting,
		waitForSources,
	};
}
