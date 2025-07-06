import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SidebarProvider } from "@/components/ui/sidebar"; // adjust path if needed
import { AppSidebar } from "./app-sidebar";

describe("AppSidebar", () => {
	function renderWithProvider() {
		return render(
			<SidebarProvider>
				<AppSidebar />
			</SidebarProvider>,
		);
	}

	it("renders logo and title", () => {
		renderWithProvider();
		expect(screen.getByTestId("sidebar-logo")).toBeInTheDocument();
		expect(screen.getByTestId("sidebar-title")).toBeInTheDocument();
	});

	it("renders New Application button", () => {
		renderWithProvider();
		expect(screen.getByTestId("new-application-button")).toBeInTheDocument();
	});

	it("renders Support and Logout buttons", () => {
		renderWithProvider();
		expect(screen.getByTestId("support-button")).toBeInTheDocument();
		expect(screen.getByTestId("logout-button")).toBeInTheDocument();
	});

	it("renders CustomSidebarTrigger and NavMain", () => {
		renderWithProvider();
		expect(screen.getByTestId("sidebar-trigger")).toBeInTheDocument();
		expect(screen.getByTestId("nav-main")).toBeInTheDocument();
	});
});
