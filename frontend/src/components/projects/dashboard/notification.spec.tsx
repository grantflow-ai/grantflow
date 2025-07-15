import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Notification } from "./notification";

describe("Notification component", () => {
	it("shows notification dropdown and items when triggered", async () => {
		const user = userEvent.setup();
		render(<Notification />);

		// Click the bell icon to open dropdown
		await user.click(screen.getByTestId("notification-trigger"));

		// Check dropdown appears
		expect(await screen.findByTestId("notification-panel")).toBeInTheDocument();

		// Check that the red dot exists
		expect(screen.getByTestId("notification-dot-1")).toBeInTheDocument();

		// Check all three items render
		const items = screen.getAllByTestId(/notification-item-/);
		expect(items).toHaveLength(3);

		// Optional: check first title and description by test id
		expect(screen.getByTestId("notification-title-1")).toHaveTextContent("7 days until grant deadline");
		expect(screen.getByTestId("notification-description-1")).toHaveTextContent(/Neuroadaptive Interfaces/);

		// Optional: check dot and close icon exist
		expect(screen.getByTestId("notification-dot-1")).toBeInTheDocument();
		expect(screen.getByTestId("notification-close-1")).toBeInTheDocument();
	});
});
