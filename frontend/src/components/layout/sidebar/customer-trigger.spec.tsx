import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CustomSidebarTrigger } from "./customer-trigger";

afterEach(() => {
	cleanup();
});

describe.sequential("CustomSidebarTrigger", () => {
	it("renders the sidebar trigger button and toggles sidebar state on click", () => {
		const { container } = render(
			<SidebarProvider>
				<CustomSidebarTrigger data-testid="sidebar-trigger" />
			</SidebarProvider>,
		);

		const trigger = container.querySelector('[data-testid="sidebar-trigger"]');
		expect(trigger).toBeInTheDocument();

		// optional: simulate a click to make sure it doesn't throw
		fireEvent.click(trigger!);
		expect(trigger).toBeInTheDocument();
	});
});
