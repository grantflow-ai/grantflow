import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { NavProjects } from "./nav-projects";

afterEach(() => {
	cleanup();
});

describe.sequential("NavProjects", () => {
	it("renders workspace trigger and items correctly", () => {
		render(
			<SidebarProvider>
				<NavProjects />
			</SidebarProvider>,
		);

		const trigger = screen.getByTestId("workspace-trigger");
		fireEvent.click(trigger);

		expect(screen.getByTestId("workspace-item-account")).toBeInTheDocument();

		expect(screen.getByTestId("workspace-trigger")).toBeInTheDocument();
		expect(screen.getByTestId("workspace-label")).toHaveTextContent("My Workspace");
		expect(screen.getByTestId("workspace-icon")).toBeInTheDocument();
		expect(screen.getByTestId("workspace-chevron")).toBeInTheDocument();

		expect(screen.getByTestId("workspace-content")).toBeInTheDocument();

		expect(screen.getByTestId("workspace-item-account")).toBeInTheDocument();
		expect(screen.getByTestId("workspace-item-billing")).toBeInTheDocument();
		expect(screen.getByTestId("workspace-item-members")).toBeInTheDocument();
		expect(screen.getByTestId("workspace-item-notifications")).toBeInTheDocument();
	});
});
