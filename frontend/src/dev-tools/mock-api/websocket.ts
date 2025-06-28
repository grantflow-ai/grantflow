import {
	RagProcessingStatusMessageFactory,
	SourceProcessingNotificationMessageFactory,
	WebSocketMessageFactory,
} from "::testing/factories";
import { getEnv } from "@/utils/env";
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

	// Getter for current scenario
	get currentScenario() {
		return this._currentScenario;
	}
	private _currentScenario?: WebSocketScenario; // Store current scenario
	private eventListeners = new Map<string, Set<EventListener>>();

	// private messageQueue: MessageEvent[] = []; // unused for now
	private intervalId?: NodeJS.Timeout;

	constructor(url: string | URL, _protocols?: string | string[]) {
		if (!isMockAPIEnabled()) {
			throw new Error("Mock WebSocket should only be used in mock mode");
		}

		this.url = url.toString();
		console.log(`[Mock WebSocket] Created for URL: ${this.url}`);

		// Simulate connection opening
		setTimeout(() => {
			this.readyState = this.OPEN;
			const openEvent = new Event("open");
			this.dispatchEvent(openEvent);
			console.log("[Mock WebSocket] Connection opened");

			// Start default scenario
			this.startScenario("default");
		}, 100);
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

		console.log(`[Mock WebSocket] Closing connection. Code: ${code}, Reason: ${reason}`);
		this.readyState = this.CLOSING;

		// Clear any running scenarios
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
		// Call direct event handlers
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

		// Call addEventListener handlers
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

		console.log("[Mock WebSocket] Sending data:", data);

		// Echo back for testing
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

	// Mock-specific methods
	sendMessage(data: unknown): void {
		if (this.readyState !== this.OPEN) {
			return;
		}

		const messageEvent = new MessageEvent("message", {
			data: JSON.stringify(data),
			origin: this.url,
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
		console.log(`[Mock WebSocket] Starting scenario: ${scenarioName}`);

		// Clear existing scenario
		if (this.intervalId) {
			clearInterval(this.intervalId);
		}

		const scenarios = this.getScenarios();
		const scenario = scenarios.find((s) => s.name === scenarioName);

		if (!scenario) {
			console.warn(`[Mock WebSocket] Unknown scenario: ${scenarioName}`);
			return;
		}

		this._currentScenario = scenario;
		let messageIndex = 0;

		const sendNextMessage = () => {
			if (messageIndex >= scenario.messages.length) {
				// Restart scenario
				messageIndex = 0;
			}

			const { data, delay } = scenario.messages[messageIndex];
			setTimeout(() => {
				this.sendMessage(data);
			}, delay);

			messageIndex++;
		};

		// Send first message immediately
		sendNextMessage();

		// Set up interval for subsequent messages
		this.intervalId = setInterval(sendNextMessage, 5000);
	}

	stopScenario(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
		this._currentScenario = undefined;
		console.log("[Mock WebSocket] Stopped scenario");
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
								event: "grant_template_extraction",
								message: "Starting template extraction...",
								total_pipeline_stages: 5,
							},
						}),
						delay: 0,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 2,
								data: { section_count: 8 },
								event: "sections_extracted",
								message: "Extracted 8 sections",
								total_pipeline_stages: 5,
							},
						}),
						delay: 3000,
					},
					{
						data: RagProcessingStatusMessageFactory.build({
							data: {
								current_pipeline_stage: 5,
								data: { objective_count: 3, total_tasks: 12 },
								event: "objectives_enriched",
								message: "Enriched 3 objectives",
								total_pipeline_stages: 5,
							},
						}),
						delay: 5000,
					},
				],
				name: "rag-processing",
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
		];
	}
}

// Export a factory function for creating mock WebSocket instances (for testing)
export function createMockWebSocket(url: string | URL, protocols?: string | string[]): WebSocket {
	if (!isMockAPIEnabled()) {
		// Return real WebSocket in non-mock mode
		return new WebSocket(url, protocols);
	}
	return new MockWebSocket(url, protocols);
}

/**
 * Get the WebSocket URL for the current environment
 * In mock mode, returns a mock WebSocket server URL
 * In production, returns the real backend WebSocket URL
 */
export function getWebSocketUrl(path: string): string {
	if (isMockAPIEnabled()) {
		// Return mock WebSocket URL that will be handled by our mock implementation
		return `ws://localhost:3001${path}`;
	}

	// Convert backend API URL to WebSocket URL
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

	console.log("[Mock API] Initializing WebSocket mocking");

	// Store original WebSocket constructor
	const OriginalWebSocket = globalThis.WebSocket;

	// Create a constructor function that proxies to the appropriate implementation
	function WebSocketProxy(this: any, url: string | URL, protocols?: string | string[]) {
		// Check if this is a mock URL
		const urlString = url.toString();
		if (urlString.includes("localhost:3001") || isMockAPIEnabled()) {
			const mockWs = new MockWebSocket(url, protocols);
			// Copy properties to this instance
			Object.setPrototypeOf(this, Object.getPrototypeOf(mockWs));
			return Object.assign(this, mockWs);
		}
		// For non-mock URLs, use original WebSocket
		const realWs = new OriginalWebSocket(url, protocols);
		Object.setPrototypeOf(this, Object.getPrototypeOf(realWs));
		return Object.assign(this, realWs);
	}

	// Set up the prototype chain
	WebSocketProxy.prototype = MockWebSocket.prototype;

	// Replace the WebSocket constructor
	globalThis.WebSocket = WebSocketProxy as any;

	// Copy static properties
	Object.defineProperty(globalThis.WebSocket, "CONNECTING", { value: 0 });
	Object.defineProperty(globalThis.WebSocket, "OPEN", { value: 1 });
	Object.defineProperty(globalThis.WebSocket, "CLOSING", { value: 2 });
	Object.defineProperty(globalThis.WebSocket, "CLOSED", { value: 3 });
}
