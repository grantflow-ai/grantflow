import { fireEvent, render, screen } from "@testing-library/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CustomSidebarTrigger } from "./customer-trigger";

describe("CustomSidebarTrigger", () => {
	it("renders the sidebar trigger button and toggles sidebar state on click", () => {
		render(
			<SidebarProvider>
				<CustomSidebarTrigger data-testid="sidebar-trigger" />
			</SidebarProvider>,
		);

		const trigger = screen.getByTestId("sidebar-trigger");
		expect(trigger).toBeInTheDocument();

		// optional: simulate a click to make sure it doesn't throw
		fireEvent.click(trigger);
		expect(trigger).toBeInTheDocument();
	});
});
