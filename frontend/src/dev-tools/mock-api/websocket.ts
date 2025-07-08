import {
	AutofillProgressMessageFactory,
	RagProcessingStatusMessageFactory,
	SourceProcessingNotificationMessageFactory,
	WebSocketMessageFactory,
} from "::testing/factories";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger";
import { isMockAPIEnabled } from "./client";

interface WebSocketScenario {
	messages: {
		data: unknown;
		delay: number;
	}[];
	name: string;
}

export class MockWebSocket implements WebSocket {
	binaryType: BinaryType = "blob";
	bufferedAmount = 0;
	readonly CLOSED = 3;
	readonly CLOSING = 2;

	readonly CONNECTING = 0;
	extensions = "";
	onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
	onerror: ((this: WebSocket, ev: Event) => any) | null = null;
	onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
	onopen: ((this: WebSocket, ev: Event) => any) | null = null;

	readonly OPEN = 1;
	protocol = "";
	readyState: number = this.CONNECTING;
	url: string;

	get applicationId() {
		return this._applicationId;
	}

	get currentScenario() {
		return this._currentScenario;
	}
	private _applicationId?: string;
	private _currentScenario?: WebSocketScenario;
	private eventListeners = new Map<string, Set<EventListener>>();

	private intervalId?: NodeJS.Timeout;

	constructor(url: string | URL, _protocols?: string | string[]) {
		if (!isMockAPIEnabled()) {
			throw new Error("Mock WebSocket should only be used in mock mode");
		}

		this.url = url.toString();

		const urlPath = new URL(this.url).pathname;
		const applicationMatch = /applications\/([^/]+)/.exec(urlPath);
		if (applicationMatch) {
			this._applicationId = applicationMatch[1];
		}

		setTimeout(() => {
			log.info("[Mock WebSocket] About to open connection", {
				applicationId: this._applicationId,
				eventListenerCount: this.eventListeners.size,
				hasOnOpenHandler: !!this.onopen,
			});

			this.readyState = this.OPEN;
			const openEvent = new Event("open");

			log.info("[Mock WebSocket] Connection opened", {
				applicationId: this._applicationId,
				readyState: this.readyState,
			});

			this.dispatchEvent(openEvent);

			if (this.onopen) {
				log.info("[Mock WebSocket] Calling onopen handler", {
					applicationId: this._applicationId,
				});
				try {
					this.onopen.call(this, openEvent);
				} catch (error) {
					log.error("[Mock WebSocket] Error calling onopen handler", {
						applicationId: this._applicationId,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}
		}, 1000);
	}

	addEventListener<K extends keyof WebSocketEventMap>(
		type: K,
		listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
		options?: AddEventListenerOptions | boolean,
	): void;
	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		_options?: AddEventListenerOptions | boolean,
	): void {
		if (!this.eventListeners.has(type)) {
			this.eventListeners.set(type, new Set());
		}
		this.eventListeners.get(type)!.add(listener as EventListener);
	}

	close(code?: number, reason?: string): void {
		if (this.readyState === this.CLOSING || this.readyState === this.CLOSED) {
			return;
		}

		this.readyState = this.CLOSING;

		if (this.intervalId) {
			clearInterval(this.intervalId);
		}

		setTimeout(() => {
			this.readyState = this.CLOSED;
			const closeEvent = new CloseEvent("close", {
				code: code ?? 1000,
				reason: reason ?? "Normal closure",
				wasClean: true,
			});
			this.dispatchEvent(closeEvent);
		}, 50);
	}
	dispatchEvent(event: Event): boolean {
		switch (event.type) {
			case "close": {
				this.onclose?.(event as CloseEvent);
				break;
			}
			case "error": {
				this.onerror?.(event);
				break;
			}
			case "message": {
				this.onmessage?.(event as MessageEvent);
				break;
			}
			case "open": {
				this.onopen?.(event);
				break;
			}
		}

		const listeners = this.eventListeners.get(event.type);
		if (listeners) {
			listeners.forEach((listener) => {
				if (typeof listener === "function") {
					listener.call(this, event);
				} else if (typeof listener === "object" && listener && "handleEvent" in listener) {
					(listener as EventListenerObject).handleEvent(event);
				}
			});
		}

		return true;
	}

	removeEventListener<K extends keyof WebSocketEventMap>(
		type: K,
		listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
		options?: boolean | EventListenerOptions,
	): void;
	removeEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		_options?: boolean | EventListenerOptions,
	): void {
		const listeners = this.eventListeners.get(type);
		if (listeners) {
			listeners.delete(listener as EventListener);
		}
	}

	send(data: ArrayBufferLike | ArrayBufferView | Blob | string): void {
		if (this.readyState !== this.OPEN) {
			throw new Error("WebSocket is not open");
		}

		setTimeout(() => {
			const echoMessage = {
				data: { message: `Echo: ${typeof data === "string" ? data : JSON.stringify(data)}` },
				event: "echo",
				parent_id: crypto.randomUUID(),
				type: "info" as const,
			};
			this.sendMessage(echoMessage);
		}, 50);
	}

	sendMessage(data: unknown): void {
		if (this.readyState !== this.OPEN) {
			log.warn("[Mock WebSocket] Cannot send message - connection not open", {
				applicationId: this._applicationId,
				readyState: this.readyState,
			});
			return;
		}

		const messageEvent = new MessageEvent("message", {
			data: JSON.stringify(data),
			origin: this.url,
		});

		log.info("[Mock WebSocket] Sending message", {
			applicationId: this._applicationId,
			data,
			messageType:
				typeof data === "object" && data && "event" in data ? (data as { event: string }).event : "unknown",
		});
		this.dispatchEvent(messageEvent);
	}

	simulateDisconnect(): void {
		this.close(1006, "Simulated disconnect");
	}

	simulateError(message = "Mock WebSocket error"): void {
		const errorEvent = new Event("error");
		Object.defineProperty(errorEvent, "message", { value: message });
		this.dispatchEvent(errorEvent);
	}

	startScenario(scenarioName: string): void {
		log.info("[Mock WebSocket] Starting scenario", {
			applicationId: this._applicationId,
			connectionOpen: this.readyState === this.OPEN,
			scenarioName,
		});

		if (this.intervalId) {
			clearInterval(this.intervalId);
		}

		const scenarios = this.getScenarios();
		const scenario = scenarios.find((s) => s.name === scenarioName);

		if (!scenario) {
			log.warn("[Mock WebSocket] Unknown scenario", {
				applicationId: this._applicationId,
				availableScenarios: scenarios.map((s) => s.name),
				scenarioName,
			});
			return;
		}

		this._currentScenario = scenario;

		log.info("[Mock WebSocket] Scenario loaded, scheduling messages", {
			applicationId: this._applicationId,
			delays: scenario.messages.map((m) => m.delay),
			messageCount: scenario.messages.length,
			scenarioName,
		});

		scenario.messages.forEach(({ data, delay }, index) => {
			setTimeout(() => {
				if (this.readyState === this.OPEN) {
					log.info("[Mock WebSocket] Sending scheduled message", {
						applicationId: this._applicationId,
						delay,
						messageIndex: index,
						messageType:
							typeof data === "object" && data && "event" in data
								? (data as { event: string }).event
								: "unknown",
						scenarioName,
					});
					this.sendMessage(data);
				} else {
					log.warn("[Mock WebSocket] Skipping message - connection not open", {
						applicationId: this._applicationId,
						messageIndex: index,
						readyState: this.readyState,
						scenarioName,
					});
				}
			}, delay);
		});
	}

	stopScenario(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
		this._currentScenario = undefined;
	}

	private getScenarios(): WebSocketScenario[] {
		return [
			{
				messages: [
					{
						data: SourceProcessingNotificationMessageFactory.build({
							data: {
								identifier: "source-1",
								indexing_status: "CREATED",
								parent_id: "app-1",
								parent_type: "application",
								rag_source_id: "rag-1",
							},
						}),
						delay: 0,
					},
					{
						data: SourceProcessingNotificationMessageFactory.build({
							data: {
								identifier: "source-1",
								indexing_status: "INDEXING",
								parent_id: "app-1",
								parent_type: "application",
								rag_source_id: "rag-1",
							},
						}),
						delay: 2000,
					},
					{
						data: SourceProcessingNotificationMessageFactory.build({
							data: {
								identifier: "source-1",
								indexing_status: "FINISHED",
								parent_id: "app-1",
								parent_type: "application",
								rag_source_id: "rag-1",
							},
						}),
						delay: 4000,
					},
				],
				name: "default",
			},
			{
				messages: [
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 1,
								event: "grant_template_generation_started",
								message: "Starting grant template generation pipeline...",
								total_pipeline_stages: 6,
							},
						}),
						delay: 0,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 2,
								event: "extracting_cfp_data",
								message: "Extracting data from CFP content...",
								total_pipeline_stages: 6,
							},
						}),
						delay: 8000,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 3,
								data: {
									cfp_subject: "Advanced Research Grant",
									content_sections: 12,
									organization: "National Science Foundation",
									submission_date: "2024-12-15",
								},
								event: "cfp_data_extracted",
								message: "CFP data extracted successfully",
								total_pipeline_stages: 6,
							},
						}),
						delay: 18_000,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 4,
								event: "grant_template_extraction",
								message: "Extracting grant application sections from CFP content...",
								total_pipeline_stages: 6,
							},
						}),
						delay: 25_000,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 4,
								data: { organization: "National Science Foundation", section_count: 8 },
								event: "sections_extracted",
								message: "Sections extracted successfully",
								total_pipeline_stages: 6,
							},
						}),
						delay: 35_000,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 5,
								event: "grant_template_metadata",
								message: "Generating metadata for grant template sections...",
								total_pipeline_stages: 6,
							},
						}),
						delay: 42_000,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 5,
								data: { metadata_count: 8 },
								event: "metadata_generated",
								message: "Metadata generated successfully",
								total_pipeline_stages: 6,
							},
						}),
						delay: 50_000,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 6,
								event: "saving_grant_template",
								message: "Saving grant template to database...",
								total_pipeline_stages: 6,
							},
						}),
						delay: 55_000,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 6,
								data: {
									organization: "National Science Foundation",
									section_count: 8,
									template_id: "tpl-12345",
								},
								event: "grant_template_created",
								message: "Grant template created successfully",
								total_pipeline_stages: 6,
							},
						}),
						delay: 60_000,
					},
				],
				name: "grant-template-generation",
			},
			{
				messages: [
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 1,
								event: "grant_application_generation_started",
								message: "Starting grant application text generation pipeline...",
								total_pipeline_stages: 9,
							},
						}),
						delay: 0,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 2,
								event: "validating_template",
								message: "Validating grant template structure...",
								total_pipeline_stages: 9,
							},
						}),
						delay: 8000,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 3,
								data: { research_objectives_count: 3, section_count: 8 },
								event: "template_validated",
								message: "Template validation complete",
								total_pipeline_stages: 9,
							},
						}),
						delay: 15_000,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 4,
								event: "generating_section_texts",
								message: "Generating text for all grant sections...",
								total_pipeline_stages: 9,
							},
						}),
						delay: 25_000,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 5,
								data: { section_count: 8, total_words: 8750 },
								event: "section_texts_generated",
								message: "Section texts generated",
								total_pipeline_stages: 9,
							},
						}),
						delay: 95_000,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 6,
								event: "assembling_application",
								message: "Assembling complete grant application text...",
								total_pipeline_stages: 9,
							},
						}),
						delay: 115_000,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 7,
								event: "saving_application",
								message: "Saving grant application text to database...",
								total_pipeline_stages: 9,
							},
						}),
						delay: 125_000,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 8,
								data: { application_id: "app-12345", section_count: 8, word_count: 11_590 },
								event: "application_saved",
								message: "Application saved successfully",
								total_pipeline_stages: 9,
							},
						}),
						delay: 135_000,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 9,
								event: "grant_application_generation_completed",
								message: "Grant application text generation completed successfully.",
								total_pipeline_stages: 9,
							},
						}),
						delay: 150_000,
					},
				],
				name: "grant-application-generation",
			},
			{
				messages: [
					{
						data: WebSocketMessageFactory.build({
							data: {
								details: "Document format not supported",
								error: "Failed to process document",
							},
							event: "source_processing",
							type: "error",
						}),
						delay: 1000,
					},
				],
				name: "error",
			},
			{
				messages: [
					{
						data: AutofillProgressMessageFactory.build({
							data: {
								autofill_type: "research_plan",
								current_stage: 1,
								message: "Starting autofill for Research Plan...",
								total_stages: 3,
							},
							event: "autofill_started",
							type: "data",
						}),
						delay: 0,
					},
					{
						data: AutofillProgressMessageFactory.build({
							data: {
								autofill_type: "research_plan",
								current_stage: 1,
								field_name: "research_objectives",
								message: "Analyzing uploaded documents...",
								total_stages: 3,
							},
							event: "autofill_progress",
							type: "data",
						}),
						delay: 2000,
					},
					{
						data: AutofillProgressMessageFactory.build({
							data: {
								autofill_type: "research_plan",
								current_stage: 2,
								data: { objectives_count: 3 },
								field_name: "research_objectives",
								message: "Generating research objectives...",
								total_stages: 3,
							},
							event: "autofill_progress",
							type: "data",
						}),
						delay: 8000,
					},
					{
						data: AutofillProgressMessageFactory.build({
							data: {
								autofill_type: "research_plan",
								current_stage: 3,
								message: "Finalizing research plan content...",
								total_stages: 3,
							},
							event: "autofill_progress",
							type: "data",
						}),
						delay: 15_000,
					},
					{
						data: AutofillProgressMessageFactory.build({
							data: {
								autofill_type: "research_plan",
								data: { objectives_count: 3, tasks_count: 9 },
								message: "Research Plan autofill completed successfully!",
							},
							event: "autofill_completed",
							type: "data",
						}),
						delay: 20_000,
					},
				],
				name: "autofill-research-plan",
			},
			{
				messages: [
					{
						data: AutofillProgressMessageFactory.build({
							data: {
								autofill_type: "research_deep_dive",
								current_stage: 1,
								message: "Starting autofill for Research Deep Dive...",
								total_stages: 5,
							},
							event: "autofill_started",
							type: "data",
						}),
						delay: 0,
					},
					{
						data: AutofillProgressMessageFactory.build({
							data: {
								autofill_type: "research_deep_dive",
								current_stage: 1,
								field_name: "background_context",
								message: "Analyzing research context...",
								total_stages: 5,
							},
							event: "autofill_progress",
							type: "data",
						}),
						delay: 3000,
					},
					{
						data: AutofillProgressMessageFactory.build({
							data: {
								autofill_type: "research_deep_dive",
								current_stage: 2,
								field_name: "hypothesis",
								message: "Generating hypothesis and rationale...",
								total_stages: 5,
							},
							event: "autofill_progress",
							type: "data",
						}),
						delay: 10_000,
					},
					{
						data: AutofillProgressMessageFactory.build({
							data: {
								autofill_type: "research_deep_dive",
								current_stage: 3,
								field_name: "novelty_and_innovation",
								message: "Evaluating novelty and innovation...",
								total_stages: 5,
							},
							event: "autofill_progress",
							type: "data",
						}),
						delay: 18_000,
					},
					{
						data: AutofillProgressMessageFactory.build({
							data: {
								autofill_type: "research_deep_dive",
								current_stage: 4,
								field_name: "impact",
								message: "Assessing impact and feasibility...",
								total_stages: 5,
							},
							event: "autofill_progress",
							type: "data",
						}),
						delay: 25_000,
					},
					{
						data: AutofillProgressMessageFactory.build({
							data: {
								autofill_type: "research_deep_dive",
								current_stage: 5,
								field_name: "team_excellence",
								message: "Completing team excellence section...",
								total_stages: 5,
							},
							event: "autofill_progress",
							type: "data",
						}),
						delay: 32_000,
					},
					{
						data: AutofillProgressMessageFactory.build({
							data: {
								autofill_type: "research_deep_dive",
								data: { field_count: 9 },
								message: "Research Deep Dive autofill completed successfully!",
							},
							event: "autofill_completed",
							type: "data",
						}),
						delay: 40_000,
					},
				],
				name: "autofill-research-deep-dive",
			},
			{
				messages: [
					{
						data: AutofillProgressMessageFactory.build({
							data: {
								autofill_type: "research_plan",
								message: "Starting autofill for Research Plan...",
							},
							event: "autofill_started",
							type: "data",
						}),
						delay: 0,
					},
					{
						data: AutofillProgressMessageFactory.build({
							data: {
								autofill_type: "research_plan",
								message: "Failed to process documents: No valid research documents found",
							},
							event: "autofill_error",
							type: "error",
						}),
						delay: 5000,
					},
				],
				name: "autofill-error",
			},
		];
	}
}

export function createMockWebSocket(url: string | URL, protocols?: string | string[]): WebSocket {
	if (!isMockAPIEnabled()) {
		return new WebSocket(url, protocols);
	}
	return new MockWebSocket(url, protocols);
}

const activeWebSockets = new Map<string, MockWebSocket>();

/**
 * Get the WebSocket URL for the current environment
 * In mock mode, returns a mock WebSocket server URL
 * In production, returns the real backend WebSocket URL
 */
export function getWebSocketUrl(path: string): string {
	if (isMockAPIEnabled()) {
		return `ws://localhost:3001${path}`;
	}

	const backendUrl = getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL;
	const wsUrl = backendUrl.replace(/^https?:\/\//, "ws://").replace(/^http:\/\//, "ws://");
	return `${wsUrl}${path}`;
}

/**
 * Initialize WebSocket mocking for development
 * This should be called in development setup to override the global WebSocket constructor
 */
export function initializeWebSocketMocking(): void {
	if (!isMockAPIEnabled()) {
		return;
	}

	const OriginalWebSocket = globalThis.WebSocket;

	function WebSocketProxy(this: any, url: string | URL, protocols?: string | string[]) {
		if (isMockAPIEnabled()) {
			const mockWs = new MockWebSocket(url, protocols);

			if (mockWs.applicationId) {
				activeWebSockets.set(mockWs.applicationId, mockWs);

				const originalClose = mockWs.close.bind(mockWs);
				mockWs.close = (code?: number, reason?: string) => {
					if (mockWs.applicationId) {
						activeWebSockets.delete(mockWs.applicationId);
					}
					originalClose(code, reason);
				};
			}

			return mockWs as WebSocket;
		}

		return new OriginalWebSocket(url, protocols);
	}

	WebSocketProxy.prototype = MockWebSocket.prototype;

	globalThis.WebSocket = WebSocketProxy as any;

	Object.defineProperty(globalThis.WebSocket, "CONNECTING", { enumerable: true, value: 0 });
	Object.defineProperty(globalThis.WebSocket, "OPEN", { enumerable: true, value: 1 });
	Object.defineProperty(globalThis.WebSocket, "CLOSING", { enumerable: true, value: 2 });
	Object.defineProperty(globalThis.WebSocket, "CLOSED", { enumerable: true, value: 3 });
}

export function triggerWebSocketScenario(applicationId: string, scenarioName: string): void {
	const ws = activeWebSockets.get(applicationId);

	log.info("[Mock WebSocket] Attempting to trigger scenario", {
		activeApplicationIds: [...activeWebSockets.keys()],
		activeConnectionCount: activeWebSockets.size,
		applicationId,
		connectionOpen: ws ? ws.readyState === ws.OPEN : false,
		hasActiveConnection: !!ws,
		scenarioName,
	});

	if (ws && ws.readyState === ws.OPEN) {
		ws.startScenario(scenarioName);
		log.info("[Mock WebSocket] Successfully triggered scenario", {
			applicationId,
			scenarioName,
		});
	} else {
		log.warn("[Mock WebSocket] Cannot trigger scenario - no active connection", {
			activeConnections: activeWebSockets.size,
			applicationId,
			hasConnection: !!ws,
			readyState: ws?.readyState,
			scenarioName,
		});
	}
}
