import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { Notification } from "./notification";

describe.sequential("Notification component", () => {
	afterEach(() => {
		cleanup();
	});

	it("shows notification dropdown and items when open", async () => {
		render(<Notification isOpen />);

		expect(screen.getByTestId("notification-panel")).toBeInTheDocument();

		expect(screen.getByTestId("notification-dot-1")).toBeInTheDocument();

		const items = screen.getAllByTestId(/notification-item-/);
		expect(items).toHaveLength(3);

		expect(screen.getByTestId("notification-title-1")).toHaveTextContent("7 days until grant deadline");
		expect(screen.getByTestId("notification-description-1")).toHaveTextContent(/Neuroadaptive Interfaces/);

		expect(screen.getByTestId("notification-dot-1")).toBeInTheDocument();
		expect(screen.getByTestId("notification-close-1")).toBeInTheDocument();
	});
});
