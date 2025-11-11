import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminBreadcrumb } from "./admin-breadcrumb";

afterEach(() => {
	cleanup();
});

describe("AdminBreadcrumb", () => {
	describe("rendering", () => {
		it("should render all breadcrumb items", () => {
			render(<AdminBreadcrumb institutionName="National Institutes of Health" tabLabel="Sources" />);

			expect(screen.getByTestId("admin-breadcrumb")).toBeInTheDocument();
			expect(screen.getByTestId("breadcrumb-admin")).toBeInTheDocument();
			expect(screen.getByTestId("breadcrumb-granting-institutions")).toBeInTheDocument();
			expect(screen.getByTestId("breadcrumb-institution-name")).toBeInTheDocument();
			expect(screen.getByTestId("breadcrumb-tab-label")).toBeInTheDocument();
		});

		it("should display correct text for all items", () => {
			render(<AdminBreadcrumb institutionName="National Institutes of Health" tabLabel="Sources" />);

			expect(screen.getByText("Admin")).toBeInTheDocument();
			expect(screen.getByText("Granting Institutions")).toBeInTheDocument();
			expect(screen.getByText("National Institutes of Health")).toBeInTheDocument();
			expect(screen.getByText("Sources")).toBeInTheDocument();
		});

		it("should render chevron separators", () => {
			const { container } = render(
				<AdminBreadcrumb institutionName="National Institutes of Health" tabLabel="Sources" />,
			);

			const chevrons = container.querySelectorAll("svg");
			expect(chevrons.length).toBe(3);
		});
	});

	describe("navigation links", () => {
		it("should link admin to admin root", () => {
			render(<AdminBreadcrumb institutionName="National Institutes of Health" tabLabel="Sources" />);

			const adminLink = screen.getByTestId("breadcrumb-admin");
			expect(adminLink).toHaveAttribute("href", "/admin");
		});

		it("should link granting institutions to list page", () => {
			render(<AdminBreadcrumb institutionName="National Institutes of Health" tabLabel="Sources" />);

			const institutionsLink = screen.getByTestId("breadcrumb-granting-institutions");
			expect(institutionsLink).toHaveAttribute("href", "/admin/granting-institutions");
		});

		it("should not link institution name", () => {
			render(<AdminBreadcrumb institutionName="National Institutes of Health" tabLabel="Sources" />);

			const institutionName = screen.getByTestId("breadcrumb-institution-name");
			expect(institutionName.tagName).toBe("SPAN");
		});

		it("should not link tab label", () => {
			render(<AdminBreadcrumb institutionName="National Institutes of Health" tabLabel="Sources" />);

			const tabLabel = screen.getByTestId("breadcrumb-tab-label");
			expect(tabLabel.tagName).toBe("SPAN");
		});
	});

	describe("dynamic content", () => {
		it("should display custom institution name", () => {
			render(<AdminBreadcrumb institutionName="National Science Foundation" tabLabel="Edit" />);

			expect(screen.getByText("National Science Foundation")).toBeInTheDocument();
		});

		it("should display custom tab label", () => {
			render(<AdminBreadcrumb institutionName="National Institutes of Health" tabLabel="Predefined Templates" />);

			expect(screen.getByText("Predefined Templates")).toBeInTheDocument();
		});

		it("should handle long institution names", () => {
			const longName = "United States Department of Agriculture Agricultural Research Service";
			render(<AdminBreadcrumb institutionName={longName} tabLabel="Sources" />);

			expect(screen.getByText(longName)).toBeInTheDocument();
		});

		it("should handle different tab labels", () => {
			const { rerender } = render(
				<AdminBreadcrumb institutionName="National Institutes of Health" tabLabel="Sources" />,
			);

			expect(screen.getByText("Sources")).toBeInTheDocument();

			rerender(<AdminBreadcrumb institutionName="National Institutes of Health" tabLabel="Edit" />);
			expect(screen.getByText("Edit")).toBeInTheDocument();

			rerender(
				<AdminBreadcrumb institutionName="National Institutes of Health" tabLabel="Predefined Templates" />,
			);
			expect(screen.getByText("Predefined Templates")).toBeInTheDocument();
		});
	});

	describe("accessibility", () => {
		it("should have aria-label for navigation", () => {
			const { container } = render(
				<AdminBreadcrumb institutionName="National Institutes of Health" tabLabel="Sources" />,
			);

			const nav = container.querySelector("nav");
			expect(nav).toHaveAttribute("aria-label", "Breadcrumb");
		});

		it("should use semantic HTML for breadcrumb", () => {
			const { container } = render(
				<AdminBreadcrumb institutionName="National Institutes of Health" tabLabel="Sources" />,
			);

			const ol = container.querySelector("ol");
			expect(ol).toBeInTheDocument();

			const items = container.querySelectorAll("li");
			expect(items.length).toBe(7);
		});
	});
});
