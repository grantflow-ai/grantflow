import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SidebarProvider } from "@/components/ui/sidebar"; // adjust path if needed
import { AppSidebar } from "./app-sidebar";

describe("AppSidebar", () => {
	afterEach(() => {
		cleanup();
	});

	function renderWithProvider() {
		const { container } = render(
			<SidebarProvider>
				<AppSidebar />
			</SidebarProvider>,
		);
		return { container };
	}

	it("renders logo and title", () => {
		const { container } = renderWithProvider();
		expect(container.querySelector('[data-testid="sidebar-logo"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="sidebar-title"]')).toBeInTheDocument();
	});

	it("renders New Application button", () => {
		const { container } = renderWithProvider();
		expect(container.querySelector('[data-testid="new-application-button"]')).toBeInTheDocument();
	});

	it("renders Support and Logout buttons", () => {
		const { container } = renderWithProvider();
		expect(container.querySelector('[data-testid="support-button"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="logout-button"]')).toBeInTheDocument();
	});

	it("renders CustomSidebarTrigger and NavMain", () => {
		const { container } = renderWithProvider();
		expect(container.querySelector('[data-testid="sidebar-trigger"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="nav-main"]')).toBeInTheDocument();
	});
});
