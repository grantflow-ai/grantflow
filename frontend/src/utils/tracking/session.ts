const SESSION_KEY = "grantflow_session_id";

export function clearSession(): void {
	sessionStorage.removeItem(SESSION_KEY);
}

export function getSessionId(): string {
	if (typeof globalThis.window === "undefined") {
		return "server-render";
	}

	const existing = sessionStorage.getItem(SESSION_KEY);
	if (existing) {
		return existing;
	}

	const newSessionId = generateSessionId();
	sessionStorage.setItem(SESSION_KEY, newSessionId);
	return newSessionId;
}

export function refreshSession(): void {
	const sessionId = getSessionId();
	sessionStorage.setItem(SESSION_KEY, sessionId);
}

function generateSessionId(): string {
	const timestamp = Date.now();

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (crypto?.getRandomValues) {
		const array = new Uint8Array(8);
		crypto.getRandomValues(array);
		const random = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
		return `${timestamp}-${random}`;
	}

	const random = Math.random().toString(36).slice(2, 15);
	return `${timestamp}-${random}`;
}
