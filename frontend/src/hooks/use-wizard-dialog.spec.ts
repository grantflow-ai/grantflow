import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { useWizardStore } from "@/stores/wizard-store";
import { useWizardDialog } from "./use-wizard-dialog";

describe("useWizardDialog", () => {
	beforeEach(() => {
		useWizardStore.getState().reset();
	});

	it("returns correct initial state", () => {
		const { result } = renderHook(() => useWizardDialog());

		expect(result.current.isOpen).toBe(false);
		expect(typeof result.current.openDialog).toBe("function");
		expect(typeof result.current.closeDialog).toBe("function");
	});

	it("opens dialog with title and content", () => {
		const { result } = renderHook(() => useWizardDialog());
		const mockContent = createElement("div", null, "Test Content");

		act(() => {
			result.current.openDialog("Test Title", mockContent);
		});

		expect(result.current.isOpen).toBe(true);

		const dialogState = useWizardStore.getState().dialog;
		expect(dialogState.title).toBe("Test Title");
		expect(dialogState.content).toBe(mockContent);
		expect(dialogState.description).toBeUndefined();
		expect(dialogState.footer).toBeUndefined();
	});

	it("opens dialog with title, content, and options", () => {
		const { result } = renderHook(() => useWizardDialog());
		const mockContent = createElement("div", null, "Test Content");
		const mockFooter = createElement("div", null, "Test Footer");

		act(() => {
			result.current.openDialog("Test Title", mockContent, {
				description: "Test Description",
				footer: mockFooter,
			});
		});

		expect(result.current.isOpen).toBe(true);

		const dialogState = useWizardStore.getState().dialog;
		expect(dialogState.title).toBe("Test Title");
		expect(dialogState.content).toBe(mockContent);
		expect(dialogState.description).toBe("Test Description");
		expect(dialogState.footer).toBe(mockFooter);
	});

	it("opens dialog with only description option", () => {
		const { result } = renderHook(() => useWizardDialog());
		const mockContent = createElement("div", null, "Test Content");

		act(() => {
			result.current.openDialog("Test Title", mockContent, {
				description: "Test Description",
			});
		});

		expect(result.current.isOpen).toBe(true);

		const dialogState = useWizardStore.getState().dialog;
		expect(dialogState.title).toBe("Test Title");
		expect(dialogState.content).toBe(mockContent);
		expect(dialogState.description).toBe("Test Description");
		expect(dialogState.footer).toBeUndefined();
	});

	it("opens dialog with only footer option", () => {
		const { result } = renderHook(() => useWizardDialog());
		const mockContent = createElement("div", null, "Test Content");
		const mockFooter = createElement("div", null, "Test Footer");

		act(() => {
			result.current.openDialog("Test Title", mockContent, {
				footer: mockFooter,
			});
		});

		expect(result.current.isOpen).toBe(true);

		const dialogState = useWizardStore.getState().dialog;
		expect(dialogState.title).toBe("Test Title");
		expect(dialogState.content).toBe(mockContent);
		expect(dialogState.description).toBeUndefined();
		expect(dialogState.footer).toBe(mockFooter);
	});

	it("closes dialog", () => {
		const { result } = renderHook(() => useWizardDialog());

		act(() => {
			result.current.openDialog("Test Title", createElement("div", null, "Test Content"));
		});

		expect(result.current.isOpen).toBe(true);

		act(() => {
			result.current.closeDialog();
		});

		expect(result.current.isOpen).toBe(false);
	});

	it("reflects wizard store state changes", () => {
		const { result } = renderHook(() => useWizardDialog());

		expect(result.current.isOpen).toBe(false);

		act(() => {
			useWizardStore.setState({
				dialog: {
					content: createElement("div", null, "Store Content"),
					description: undefined,
					footer: undefined,
					isOpen: true,
					title: "Store Dialog",
				},
			});
		});

		expect(result.current.isOpen).toBe(true);

		act(() => {
			useWizardStore.setState({
				dialog: {
					content: createElement("div", null, "Store Content"),
					description: undefined,
					footer: undefined,
					isOpen: false,
					title: "Store Dialog",
				},
			});
		});

		expect(result.current.isOpen).toBe(false);
	});

	it("handles complex React content", () => {
		const { result } = renderHook(() => useWizardDialog());

		const complexContent = createElement(
			"div",
			null,
			createElement("h2", null, "Complex Content"),
			createElement("p", null, "This is a paragraph"),
			createElement("ul", null, createElement("li", null, "Item 1"), createElement("li", null, "Item 2")),
		);

		const complexFooter = createElement(
			"div",
			null,
			createElement("button", { type: "button" }, "Cancel"),
			createElement("button", { type: "button" }, "Confirm"),
		);

		act(() => {
			result.current.openDialog("Complex Dialog", complexContent, {
				description: "A complex dialog with multiple elements",
				footer: complexFooter,
			});
		});

		expect(result.current.isOpen).toBe(true);

		const dialogState = useWizardStore.getState().dialog;
		expect(dialogState.title).toBe("Complex Dialog");
		expect(dialogState.content).toBe(complexContent);
		expect(dialogState.description).toBe("A complex dialog with multiple elements");
		expect(dialogState.footer).toBe(complexFooter);
	});

	it("handles null and undefined content gracefully", () => {
		const { result } = renderHook(() => useWizardDialog());

		act(() => {
			result.current.openDialog("Test Title", null as any);
		});

		expect(result.current.isOpen).toBe(true);

		const dialogState = useWizardStore.getState().dialog;
		expect(dialogState.title).toBe("Test Title");
		expect(dialogState.content).toBeNull();
	});

	it("handles empty options object", () => {
		const { result } = renderHook(() => useWizardDialog());
		const mockContent = createElement("div", null, "Test Content");

		act(() => {
			result.current.openDialog("Test Title", mockContent, {});
		});

		expect(result.current.isOpen).toBe(true);

		const dialogState = useWizardStore.getState().dialog;
		expect(dialogState.title).toBe("Test Title");
		expect(dialogState.content).toBe(mockContent);
		expect(dialogState.description).toBeUndefined();
		expect(dialogState.footer).toBeUndefined();
	});

	it("maintains separate function references", () => {
		const { result: result1 } = renderHook(() => useWizardDialog());
		const { result: result2 } = renderHook(() => useWizardDialog());

		expect(result1.current.openDialog).toBe(result2.current.openDialog);
		expect(result1.current.closeDialog).toBe(result2.current.closeDialog);
	});
});
