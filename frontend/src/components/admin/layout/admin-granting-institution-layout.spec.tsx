import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminGrantingInstitutionLayout } from "./admin-granting-institution-layout";

afterEach(() => {
	cleanup();
});

describe("AdminGrantingInstitutionLayout", () => {
	describe("rendering", () => {
		it("should render children within layout", () => {
			render(
				<AdminGrantingInstitutionLayout activeTab="sources">
					<div data-testid="child-component">Test Content</div>
				</AdminGrantingInstitutionLayout>,
			);

			expect(screen.getByTestId("admin-granting-institution-layout")).toBeInTheDocument();
			expect(screen.getByTestId("child-component")).toBeInTheDocument();
			expect(screen.getByText("Test Content")).toBeInTheDocument();
		});

		it("should render all tabs", () => {
			render(
				<AdminGrantingInstitutionLayout activeTab="sources">
					<div>Content</div>
				</AdminGrantingInstitutionLayout>,
			);

			expect(screen.getByTestId("admin-granting-institution-tabs")).toBeInTheDocument();
			expect(screen.getByTestId("admin-granting-institution-tab-sources")).toBeInTheDocument();
			expect(screen.getByTestId("admin-granting-institution-tab-predefined-templates")).toBeInTheDocument();
			expect(screen.getByTestId("admin-granting-institution-tab-edit")).toBeInTheDocument();
		});

		it("should render tab labels", () => {
			render(
				<AdminGrantingInstitutionLayout activeTab="sources">
					<div>Content</div>
				</AdminGrantingInstitutionLayout>,
			);

			expect(screen.getByText("Sources")).toBeInTheDocument();
			expect(screen.getByText("Predefined Templates")).toBeInTheDocument();
			expect(screen.getByText("Edit")).toBeInTheDocument();
		});

		it("should render content container", () => {
			render(
				<AdminGrantingInstitutionLayout activeTab="sources">
					<div data-testid="content">Main Content</div>
				</AdminGrantingInstitutionLayout>,
			);

			expect(screen.getByTestId("admin-granting-institution-content")).toBeInTheDocument();
			expect(screen.getByTestId("content")).toBeInTheDocument();
		});
	});

	describe("active tab highlighting", () => {
		it("should highlight sources tab when active", () => {
			render(
				<AdminGrantingInstitutionLayout activeTab="sources">
					<div>Content</div>
				</AdminGrantingInstitutionLayout>,
			);

			const sourcesTab = screen.getByTestId("admin-granting-institution-tab-sources");
			expect(sourcesTab).toHaveClass("font-semibold", "border-b-[3px]", "border-primary");
		});

		it("should highlight predefined-templates tab when active", () => {
			render(
				<AdminGrantingInstitutionLayout activeTab="predefined-templates">
					<div>Content</div>
				</AdminGrantingInstitutionLayout>,
			);

			const templatesTab = screen.getByTestId("admin-granting-institution-tab-predefined-templates");
			expect(templatesTab).toHaveClass("font-semibold", "border-b-[3px]", "border-primary");
		});

		it("should highlight edit tab when active", () => {
			render(
				<AdminGrantingInstitutionLayout activeTab="edit">
					<div>Content</div>
				</AdminGrantingInstitutionLayout>,
			);

			const editTab = screen.getByTestId("admin-granting-institution-tab-edit");
			expect(editTab).toHaveClass("font-semibold", "border-b-[3px]", "border-primary");
		});

		it("should apply light font to inactive tabs", () => {
			render(
				<AdminGrantingInstitutionLayout activeTab="sources">
					<div>Content</div>
				</AdminGrantingInstitutionLayout>,
			);

			const templatesTab = screen.getByTestId("admin-granting-institution-tab-predefined-templates");
			const editTab = screen.getByTestId("admin-granting-institution-tab-edit");

			expect(templatesTab).toHaveClass("font-light");
			expect(editTab).toHaveClass("font-light");
		});
	});

	describe("navigation links", () => {
		it("should render correct href for sources tab", () => {
			render(
				<AdminGrantingInstitutionLayout activeTab="sources">
					<div>Content</div>
				</AdminGrantingInstitutionLayout>,
			);

			const sourcesLink = screen.getByTestId("admin-granting-institution-tab-sources");
			expect(sourcesLink).toHaveAttribute("href", "/admin/granting-institutions/sources");
		});

		it("should render correct href for predefined-templates tab", () => {
			render(
				<AdminGrantingInstitutionLayout activeTab="predefined-templates">
					<div>Content</div>
				</AdminGrantingInstitutionLayout>,
			);

			const templatesLink = screen.getByTestId("admin-granting-institution-tab-predefined-templates");
			expect(templatesLink).toHaveAttribute("href", "/admin/granting-institutions/predefined-templates");
		});

		it("should render correct href for edit tab", () => {
			render(
				<AdminGrantingInstitutionLayout activeTab="edit">
					<div>Content</div>
				</AdminGrantingInstitutionLayout>,
			);

			const editLink = screen.getByTestId("admin-granting-institution-tab-edit");
			expect(editLink).toHaveAttribute("href", "/admin/granting-institutions/edit");
		});
	});

	describe("children handling", () => {
		it("should render multiple children", () => {
			render(
				<AdminGrantingInstitutionLayout activeTab="sources">
					<div data-testid="first-child">First</div>
					<div data-testid="second-child">Second</div>
					<span data-testid="third-child">Third</span>
				</AdminGrantingInstitutionLayout>,
			);

			expect(screen.getByTestId("first-child")).toBeInTheDocument();
			expect(screen.getByTestId("second-child")).toBeInTheDocument();
			expect(screen.getByTestId("third-child")).toBeInTheDocument();
		});

		it("should handle nested components", () => {
			render(
				<AdminGrantingInstitutionLayout activeTab="sources">
					<div data-testid="parent">
						<div data-testid="nested-child">Nested Content</div>
					</div>
				</AdminGrantingInstitutionLayout>,
			);

			expect(screen.getByTestId("parent")).toBeInTheDocument();
			expect(screen.getByTestId("nested-child")).toBeInTheDocument();
			expect(screen.getByText("Nested Content")).toBeInTheDocument();
		});

		it("should handle null children", () => {
			render(<AdminGrantingInstitutionLayout activeTab="sources">{null}</AdminGrantingInstitutionLayout>);

			expect(screen.getByTestId("admin-granting-institution-layout")).toBeInTheDocument();
			expect(screen.getByTestId("admin-granting-institution-tabs")).toBeInTheDocument();
			expect(screen.getByTestId("admin-granting-institution-content")).toBeInTheDocument();
		});
	});
});
