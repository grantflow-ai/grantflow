import { render, screen } from "@testing-library/react";
import { CoreFeaturesSection } from "@/components/landing-page/core-features-section";

vi.mock("motion/react", async () => {
	const actual = vi.importActual("motion/react");
	return {
		...(await actual),
		motion: {
			article: vi.fn().mockImplementation(({ children, ...props }) => <article {...props}>{children}</article>),
			div: vi.fn().mockImplementation(({ children, ...props }) => <div {...props}>{children}</div>),
			h3: vi.fn().mockImplementation(({ children, ...props }) => <h3 {...props}>{children}</h3>),
			p: vi.fn().mockImplementation(({ children, ...props }) => <p {...props}>{children}</p>),
		},
	};
});

vi.mock("./backgrounds", () => ({
	PatternedBackground: vi
		.fn()
		.mockImplementation(({ className }) => (
			<div className={className} data-testid="mock-patterned-background"></div>
		)),
}));

vi.mock("./scroll-fade-element", () => ({
	ScrollFadeElement: vi.fn().mockImplementation(({ children, className }) => (
		<div className={className} data-testid="mock-scroll-fade-element">
			{children}
		</div>
	)),
}));

describe("CoreFeaturesSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the section with correct aria label", () => {
		render(<CoreFeaturesSection />);
		const section = screen.getByLabelText("core-features-section");
		expect(section).toBeInTheDocument();
	});

	it("renders the patterned background", () => {
		render(<CoreFeaturesSection />);
		const background = screen.getByTestId("mock-patterned-background");
		expect(background).toBeInTheDocument();
	});

	it("renders the heading with ScrollFadeElement", () => {
		render(<CoreFeaturesSection />);
		const scrollFadeElement = screen.getByTestId("mock-scroll-fade-element");
		expect(scrollFadeElement).toBeInTheDocument();

		const heading = screen.getByText("Core Features Designed for Researchers");
		expect(heading).toBeInTheDocument();
		expect(heading.id).toBe("core-features-heading");
	});

	it("renders 8 feature articles in total (4 in mobile + 4 in desktop view)", () => {
		render(<CoreFeaturesSection />);

		const platformFeatures = screen.getAllByText("A Platform Built for Researchers");
		const studioFeatures = screen.getAllByText("Grant Applications Studio");
		const workspaceFeatures = screen.getAllByText("Collaborative Workspace");
		const proposalFeatures = screen.getAllByText("Customizable Proposals");

		expect(platformFeatures.length).toBe(2);
		expect(studioFeatures.length).toBe(2);
		expect(workspaceFeatures.length).toBe(2);
		expect(proposalFeatures.length).toBe(2);
	});

	it("renders all feature articles with correct titles", () => {
		render(<CoreFeaturesSection />);

		const platformTitles = screen.getAllByText("A Platform Built for Researchers");
		const studioTitles = screen.getAllByText("Grant Applications Studio");
		const workspaceTitles = screen.getAllByText("Collaborative Workspace");
		const proposalTitles = screen.getAllByText("Customizable Proposals");

		expect(platformTitles).toHaveLength(2);
		expect(studioTitles).toHaveLength(2);
		expect(workspaceTitles).toHaveLength(2);
		expect(proposalTitles).toHaveLength(2);

		platformTitles.forEach((title) => expect(title).toBeInTheDocument());
		studioTitles.forEach((title) => expect(title).toBeInTheDocument());
		workspaceTitles.forEach((title) => expect(title).toBeInTheDocument());
		proposalTitles.forEach((title) => expect(title).toBeInTheDocument());
	});

	it("renders all feature descriptions", () => {
		render(<CoreFeaturesSection />);

		const platformDescriptions = screen.getAllByText(/GrantFlow was built with researchers' unique needs in mind/);
		const studioDescriptions = screen.getAllByText(/Organize all your research projects in one workspace/);
		const workspaceDescriptions = screen.getAllByText(/Easily integrate feedback from collaborators/);
		const proposalDescriptions = screen.getAllByText(/Create proposals customized to any funding opportunity/);

		expect(platformDescriptions).toHaveLength(2);
		expect(studioDescriptions).toHaveLength(2);
		expect(workspaceDescriptions).toHaveLength(2);
		expect(proposalDescriptions).toHaveLength(2);

		platformDescriptions.forEach((desc) => expect(desc).toBeInTheDocument());
		studioDescriptions.forEach((desc) => expect(desc).toBeInTheDocument());
		workspaceDescriptions.forEach((desc) => expect(desc).toBeInTheDocument());
		proposalDescriptions.forEach((desc) => expect(desc).toBeInTheDocument());
	});

	it("renders both mobile and desktop feature containers", () => {
		render(<CoreFeaturesSection />);

		const mobileContainers = document.querySelectorAll('[class*="snap-x"][class*="md:hidden"]');
		expect(mobileContainers.length).toBeGreaterThan(0);

		const desktopContainers = document.querySelectorAll('[class*="md:grid"]');
		expect(desktopContainers.length).toBeGreaterThan(0);

		const [mobileContainer] = mobileContainers;
		const mobileItems = mobileContainer.querySelectorAll('article, [data-testid="feature-item"]');
		expect(mobileItems.length).toBe(4);

		const [desktopContainer] = desktopContainers;
		const desktopItems = desktopContainer.querySelectorAll('article, [data-testid="feature-item"]');
		expect(desktopItems.length).toBe(4);
	});
});
