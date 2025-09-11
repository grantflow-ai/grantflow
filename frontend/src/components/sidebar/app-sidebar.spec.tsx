import { cleanup, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

describe.sequential("AppSidebar", () => {
	afterEach(() => {
		cleanup();
	});

	function renderWithProvider(props = {}) {
		const { container } = render(
			<SidebarProvider>
				<AppSidebar {...props} />
			</SidebarProvider>,
		);
		return { container };
	}

	it("renders logo", () => {
		const { container } = renderWithProvider();
		expect(container.querySelector('[data-testid="sidebar-logo"]')).toBeInTheDocument();
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

	it("renders nothing when hidden prop is true", () => {
		const { container } = renderWithProvider({ hidden: true });
		expect(container.querySelector('[data-testid="sidebar-logo"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="new-application-button"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="support-button"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="logout-button"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="sidebar-trigger"]')).not.toBeInTheDocument();
		expect(container.querySelector('[data-testid="nav-main"]')).not.toBeInTheDocument();
	});

	it("renders normally when hidden prop is false", () => {
		const { container } = renderWithProvider({ hidden: false });
		expect(container.querySelector('[data-testid="sidebar-logo"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="new-application-button"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="support-button"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="logout-button"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="sidebar-trigger"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="nav-main"]')).toBeInTheDocument();
	});
});
