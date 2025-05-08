import { render, screen } from "@testing-library/react";
import { LegalPageContainer, TitledLegalSection, UntitledLegalSection } from "@/components/info-legal-page-components";

describe("LegalPageContainer", () => {
	describe("Default Props", () => {
		it("should render main container with light background and black text by default", () => {
			render(<LegalPageContainer title="Test Title">Test content</LegalPageContainer>);

			expect(screen.getByText("Test Title")).toBeInTheDocument();
			expect(screen.getByText("Test content")).toBeInTheDocument();

			const mainContainer = screen
				.getByRole("heading", { name: "Test Title" })
				.closest("div.w-full.min-h-screen.z-20");
			expect(mainContainer).toHaveClass("bg-light");
			expect(mainContainer).toHaveClass("text-black");
		});

		it("should display title in h2 heading with medium font weight by default", () => {
			render(<LegalPageContainer title="Default Heading">Content</LegalPageContainer>);

			const heading = screen.getByRole("heading", { name: "Default Heading" });
			expect(heading.tagName).toBe("H2");
			expect(heading).toHaveClass("text-4xl");
			expect(heading).toHaveClass("font-medium");
		});

		it("should align text to the left by default", () => {
			render(<LegalPageContainer title="Left Aligned">Content</LegalPageContainer>);

			const contentContainer = screen.getByText("Left Aligned").parentElement;
			expect(contentContainer).toHaveClass("text-start");
			expect(contentContainer).not.toHaveClass("text-center");
		});

		it("should use custom width container by default", () => {
			render(<LegalPageContainer title="Custom Width">Content</LegalPageContainer>);

			const contentContainer = screen.getByText("Custom Width").parentElement;
			expect(contentContainer).toHaveClass("w-198");
			expect(contentContainer).not.toHaveClass("w-full");
		});

		it("should not render background stack by default", () => {
			const { container } = render(<LegalPageContainer title="No Background">Content</LegalPageContainer>);

			const backgroundStackContainers = container.querySelectorAll(".absolute.inset-0.size-full.overflow-hidden");
			expect(backgroundStackContainers.length).toBe(0);
		});

		it("should render with proper spacing for readability by default", () => {
			render(<LegalPageContainer title="Spacing Test">Content</LegalPageContainer>);

			const mainContainer = screen
				.getByRole("heading", { name: "Spacing Test" })
				.closest("div.w-full.min-h-screen.z-20");

			expect(mainContainer).toHaveClass("py-20");
			expect(mainContainer).toHaveClass("px-30");

			const heading = screen.getByRole("heading", { name: "Spacing Test" });
			expect(heading).toHaveClass("mb-6");
		});

		it("should render a full viewport height container by default", () => {
			render(<LegalPageContainer title="Full Height">Content</LegalPageContainer>);

			const mainContainer = screen.getByRole("heading", { name: "Full Height" }).closest("div.w-full");
			expect(mainContainer).toHaveClass("min-h-screen");
		});

		it("renders with minimum height to ensure page fills viewport", () => {
			render(<LegalPageContainer title="Full Height">Content</LegalPageContainer>);

			const mainContainer = screen
				.getByRole("heading", { name: "Full Height" })
				.closest("div.w-full.min-h-screen.z-20");
			expect(mainContainer).toHaveClass("min-h-screen");
		});
	});

	describe("Applies all props forwarded", () => {
		it("applies dark background when specified", () => {
			render(
				<LegalPageContainer background="dark" title="Title">
					Content
				</LegalPageContainer>,
			);

			expect(screen.getByText("Title")).toBeInTheDocument();
			expect(screen.getByText("Content")).toBeInTheDocument();

			const mainContainer = screen
				.getByRole("heading", { name: "Title" })
				.closest("div.w-full.min-h-screen.z-20");
			expect(mainContainer).toHaveClass("bg-dark");
		});

		it("renders h1 with correct styling when headingLevel is h1", () => {
			render(
				<LegalPageContainer headingLevel="h1" title="H1 Title">
					Content
				</LegalPageContainer>,
			);

			const heading = screen.getByText("H1 Title");
			expect(heading.tagName).toBe("H1");
			expect(heading).toHaveClass("text-[4.25rem]", "font-normal");
		});

		it("centers text when isTextCentered is true", () => {
			render(
				<LegalPageContainer isTextCentered title="Title">
					Content
				</LegalPageContainer>,
			);

			const contentContainer = screen.getByText("Title").parentElement;
			expect(contentContainer).toHaveClass("text-center");
		});

		it("applies full width when childrenSpan is parent", () => {
			render(
				<LegalPageContainer childrenSpan="parent" title="Title">
					Content
				</LegalPageContainer>,
			);

			const contentContainer = screen.getByText("Title").parentElement;
			expect(contentContainer).toHaveClass("w-full");
		});

		it("renders backgroundStack when provided", () => {
			const backgroundElement = <div data-testid="background-element">Background</div>;
			render(
				<LegalPageContainer backgroundStack={backgroundElement} title="Title">
					Content
				</LegalPageContainer>,
			);

			expect(screen.getByTestId("background-element")).toBeInTheDocument();
		});

		it("applies custom text color when provided", () => {
			render(
				<LegalPageContainer textColor="text-red-500" title="Title">
					Content
				</LegalPageContainer>,
			);

			const mainContainer = screen
				.getByRole("heading", { name: "Title" })
				.closest("div.w-full.min-h-screen.z-20");
			expect(mainContainer).toHaveClass("text-red-500");
		});
	});

	describe("Semantic Structure", () => {
		it("has proper heading structure for document outline", () => {
			render(<LegalPageContainer title="Page Title">Content</LegalPageContainer>);

			const heading = screen.getByRole("heading", { name: "Page Title" });
			expect(heading).toBeInTheDocument();
			expect(heading.tagName).toBe("H2");
		});

		it("maintains proper heading hierarchy when using h1", () => {
			render(
				<LegalPageContainer headingLevel="h1" title="Main Title">
					<div>
						<h2>Section Title</h2>
						<p>Content</p>
					</div>
				</LegalPageContainer>,
			);

			const mainHeading = screen.getByRole("heading", { level: 1, name: "Main Title" });
			const sectionHeading = screen.getByRole("heading", { level: 2, name: "Section Title" });

			expect(mainHeading).toBeInTheDocument();
			expect(sectionHeading).toBeInTheDocument();
		});

		it("preserves aria attributes on child elements", () => {
			render(
				<LegalPageContainer title="Accessibility Test">
					<button aria-label="Action button" data-testid="test-button">
						Click me
					</button>
				</LegalPageContainer>,
			);

			const button = screen.getByTestId("test-button");
			expect(button).toHaveAttribute("aria-label", "Action button");
		});
	});

	it("contains correct z-index layering for the content", () => {
		render(<LegalPageContainer title="Semantic Structure">Test content</LegalPageContainer>);

		const mainContainer = screen
			.getByRole("heading", { name: "Semantic Structure" })
			.closest("div.w-full.min-h-screen.z-20");
		expect(mainContainer).toHaveClass("z-20");

		const contentContainer = screen.getByText("Semantic Structure").parentElement;
		expect(contentContainer).toHaveClass("z-30");
	});
});

describe("TitledLegalSection", () => {
	describe("Content Rendering", () => {
		it("renders clause content properly", () => {
			render(
				<TitledLegalSection
					clause={<p>Your data is protected under GDPR regulations.</p>}
					title="Privacy Terms"
				/>,
			);

			expect(screen.getByText("Your data is protected under GDPR regulations.")).toBeInTheDocument();
		});

		it("renders complex clause content with multiple elements", () => {
			render(
				<TitledLegalSection
					clause={
						<>
							<p>First paragraph</p>
							<ul>
								<li>List item 1</li>
								<li>List item 2</li>
							</ul>
						</>
					}
					title="Complex Content"
				/>,
			);

			expect(screen.getByText("First paragraph")).toBeInTheDocument();
			expect(screen.getByText("List item 1")).toBeInTheDocument();
			expect(screen.getByText("List item 2")).toBeInTheDocument();
		});
	});

	describe("Semantic Structure", () => {
		it("uses section element as container for proper document structure", () => {
			render(<TitledLegalSection clause={<p>Content</p>} title="Section Title" />);

			const section = screen.getByText("Section Title").closest("section");
			expect(section).toBeInTheDocument();
		});

		it("uses h4 element for the title for proper heading hierarchy", () => {
			render(<TitledLegalSection clause={<p>Content</p>} title="Heading Test" />);

			const heading = screen.getByText("Heading Test");
			expect(heading.tagName).toBe("H4");
		});
	});

	describe("Title Rendering", () => {
		it("displays the title correctly", () => {
			render(<TitledLegalSection clause={<p>Content</p>} title="Terms of Service" />);

			expect(screen.getByText("Terms of Service")).toBeInTheDocument();
		});

		it("applies bold styling to the title", () => {
			render(<TitledLegalSection clause={<p>Content</p>} title="Bold Title" />);

			const title = screen.getByText("Bold Title");
			expect(title).toHaveClass("font-bold");
		});
	});

	describe("ID Attribute", () => {
		it("applies ID when provided for direct linking", () => {
			render(<TitledLegalSection clause={<p>Content</p>} id="section-1" title="Linkable Section" />);

			const section = screen.getByText("Linkable Section").closest("section");
			expect(section).toHaveAttribute("id", "section-1");
		});

		it("does not apply ID when not provided", () => {
			render(<TitledLegalSection clause={<p>Content</p>} title="No ID Section" />);

			const section = screen.getByText("No ID Section").closest("section");
			expect(section).not.toHaveAttribute("id");
		});
	});
});

describe("UntitledLegalSection", () => {
	describe("Content Rendering", () => {
		it("renders clause content properly", () => {
			render(<UntitledLegalSection clause={<p>This is an untitled legal clause.</p>} />);

			expect(screen.getByText("This is an untitled legal clause.")).toBeInTheDocument();
		});

		it("renders complex clause content with nested elements", () => {
			render(
				<UntitledLegalSection
					clause={
						<div>
							<p>Main paragraph</p>
							<div>
								<p>Nested content</p>
							</div>
						</div>
					}
				/>,
			);

			expect(screen.getByText("Main paragraph")).toBeInTheDocument();
			expect(screen.getByText("Nested content")).toBeInTheDocument();
		});
	});

	describe("Semantic Structure", () => {
		it("uses section element as container for proper document structure", () => {
			render(<UntitledLegalSection clause={<p>Section content</p>} />);

			const section = screen.getByText("Section content").closest("section");
			expect(section).toBeInTheDocument();
			expect(section).toHaveClass("leading-tight");
		});

		it("does not contain heading elements", () => {
			const { container } = render(<UntitledLegalSection clause={<p>No heading here</p>} />);

			const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
			expect(headings.length).toBe(0);
		});
	});

	describe("ID Attribute", () => {
		it("applies ID when provided for direct linking", () => {
			render(<UntitledLegalSection clause={<p>Content with ID</p>} id="untitled-section" />);

			const section = screen.getByText("Content with ID").closest("section");
			expect(section).toHaveAttribute("id", "untitled-section");
		});

		it("does not apply ID when not provided", () => {
			render(<UntitledLegalSection clause={<p>Content without ID</p>} />);

			const section = screen.getByText("Content without ID").closest("section");
			expect(section).not.toHaveAttribute("id");
		});
	});
});
