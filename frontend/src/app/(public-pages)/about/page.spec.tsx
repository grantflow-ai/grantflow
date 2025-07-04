import { cleanup, render, screen } from "@testing-library/react";

import AboutPage from "@/app/(public-pages)/about/page";

vi.mock("@/hooks/use-mobile", () => ({
	useIsMobile: ()=> false,
}));

vi.mock("@/components/about/icons", () => ({
	IconDraft: vi.fn().mockImplementation(() => <div data-testid="mock-icon-draft" />),
	IconHourglass: vi.fn().mockImplementation(() => <div data-testid="mock-icon-hourglass" />),
	IconOrganize: vi.fn().mockImplementation(() => <div data-testid="mock-icon-organize" />),
	IconRefine: vi.fn().mockImplementation(() => <div data-testid="mock-icon-refine" />),
}));

vi.mock("@/components/shared/info-legal-page-components", () => ({
	LegalPageContainer: vi.fn().mockImplementation(({ backgroundStack, children, ...props }) => (
		<div
			data-background={props.background}
			data-children-span={props.childrenSpan}
			data-heading-level={props.headingLevel}
			data-testid="mock-legal-page-container"
			data-text-centered={props.isTextCentered ? "true" : "false"}
			data-text-color={props.textColor}
			data-title={props.title}
		>
			{backgroundStack && <div data-testid="background-stack-container">{backgroundStack}</div>}
			<h1>{props.title}</h1>
			{children}
		</div>
	)),
}));

vi.mock("@/components/branding/brand-pattern", () => ({
	BrandPattern: vi
		.fn()
		.mockImplementation((props) => (
			<div
				aria-hidden={props["aria-hidden"]}
				className={props.className}
				data-testid="mock-brand-pattern"
				role={props.role}
			/>
		)),
}));

vi.mock("next/image", () => ({
	default: vi.fn().mockImplementation(({ alt, className, height, priority, src, width, ...props }) => (
		<div
			alt={alt}
			aria-label={alt ?? "Image"}
			className={className}
			data-alt={alt}
			data-priority={priority ? "true" : "false"}
			data-src={typeof src === "object" ? "/mocked-image-path.jpg" : src}
			data-testid="mock-image"
			role="img"
			style={{
				height: height ? `${height}px` : "auto",
				width: width ? `${width}px` : "auto",
			}}
			{...props}
		/>
	)),
}));

describe("AboutPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		cleanup();
		render(<AboutPage />);
	});

	it("renders the main content section correctly", () => {
		const container = screen.getByTestId("mock-legal-page-container");
		expect(container).toBeInTheDocument();

		expect(container).toHaveAttribute("data-title", "About GrantFlow");

		const toolkitItems = screen.getAllByTestId("mock-icon-draft");
		expect(toolkitItems.length).toBeGreaterThan(0);

		const paragraphs = container.querySelectorAll("p");
		expect(paragraphs.length).toBeGreaterThan(0);
	});

	it("displays all toolkit items", () => {
		expect(
			screen.getByText("Generate draft proposals based on previous documents and lab notes"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Organize and structure application components clearly and convincingly"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Collaborate, review and refine text with the help of an AI assistant"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Apply for more funding opportunities without increasing workload"),
		).toBeInTheDocument();

		expect(screen.getByTestId("mock-icon-draft")).toBeInTheDocument();
		expect(screen.getByTestId("mock-icon-organize")).toBeInTheDocument();
		expect(screen.getByTestId("mock-icon-refine")).toBeInTheDocument();
		expect(screen.getByTestId("mock-icon-hourglass")).toBeInTheDocument();
	});

	it("displays all founders", () => {
		expect(screen.getByText("Asaf Ronel")).toBeInTheDocument();
		expect(screen.getByText("Na’aman Hirschfeld")).toBeInTheDocument();
		expect(screen.getByText("Tirza Shatz")).toBeInTheDocument();

		expect(screen.getByText("Co founder | CEO")).toBeInTheDocument();
		expect(screen.getByText("Co-founder | CTO")).toBeInTheDocument();
		expect(screen.getByText("Co-founder | Product & UX")).toBeInTheDocument();

		const asafImage = screen.getByRole("img", { name: /Asaf Ronel/i });
		expect(asafImage).toBeInTheDocument();

		const naamanImage = screen.getByRole("img", { name: /Hirschfeld/i });
		expect(naamanImage).toBeInTheDocument();

		const tirzaImage = screen.getByRole("img", { name: /Tirza Shatz/i });
		expect(tirzaImage).toBeInTheDocument();
	});

	it("ensures toolkit items are displayed in a responsive grid layout", () => {
		const toolkitItem = screen.getByText("Generate draft proposals based on previous documents and lab notes");

		const toolkitList = toolkitItem.closest("ul");
		expect(toolkitList).toBeInTheDocument();

		const listItems = toolkitList ? toolkitList.querySelectorAll("li") : [];
		expect(listItems.length).toBe(4);

		[...listItems].forEach((item) => {
			expect(item.textContent).toBeTruthy();
			expect(item.querySelector("[data-testid^='mock-icon-']")).toBeInTheDocument();
		});
	});

	it("ensures responsive design for toolkit items grid", () => {
		const toolkitItem = screen.getByText("Generate draft proposals based on previous documents and lab notes");
		const toolkitList = toolkitItem.closest("ul");

		expect(toolkitList).toHaveClass("grid");
		expect(toolkitList).toHaveClass("grid-cols-1");
		expect(toolkitList?.className).toMatch(/md:grid-cols-[24]/);
	});

	it("ensures responsive design for founders grid", () => {
		const founderItem = screen.getByText("Asaf Ronel");
		const foundersList = founderItem.closest("ul");

		expect(foundersList).toHaveClass("grid");
		expect(foundersList).toHaveClass("grid-cols-1");
		expect(foundersList?.className).toMatch(/md:grid-cols-3/);
	});

	it("has proper section headings with responsive font sizes", () => {
		const whatWeDoHeading = screen.getByText("What We Do?");
		const whyMattersHeading = screen.getByText("Why It Matters?");

		expect(whatWeDoHeading).toBeInTheDocument();
		expect(whyMattersHeading).toBeInTheDocument();

		[whatWeDoHeading, whyMattersHeading].forEach((heading) => {
			expect(heading).toHaveClass("text-3xl");
			expect(heading).toHaveClass("md:text-4xl");
		});
	});
});
