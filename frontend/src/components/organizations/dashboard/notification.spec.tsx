import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach } from "vitest";
import { Notification } from "./notification";

describe.sequential("Notification component", () => {
	afterEach(() => {
		cleanup();
	});

	it("shows notification dropdown and items when triggered", async () => {
		const user = userEvent.setup();
		render(<Notification />);

		await user.click(screen.getByTestId("notification-trigger"));

		expect(await screen.findByTestId("notification-panel")).toBeInTheDocument();

		expect(screen.getByTestId("notification-dot-1")).toBeInTheDocument();

		const items = screen.getAllByTestId(/notification-item-/);
		expect(items).toHaveLength(3);

		expect(screen.getByTestId("notification-title-1")).toHaveTextContent("7 days until grant deadline");
		expect(screen.getByTestId("notification-description-1")).toHaveTextContent(/Neuroadaptive Interfaces/);

		expect(screen.getByTestId("notification-dot-1")).toBeInTheDocument();
		expect(screen.getByTestId("notification-close-1")).toBeInTheDocument();
	});
});
