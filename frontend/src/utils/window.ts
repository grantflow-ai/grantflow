export function disableScroll() {
	if (typeof globalThis.window !== "undefined") {
		document.body.style.overflow = "hidden";
	}
}

export function enableScroll() {
	if (typeof globalThis.window !== "undefined") {
		document.body.style.overflow = "";
	}
}
