import { render, screen } from "@testing-library/react";

import { AnimatedFeatureArticle } from "./feature-articles-animated";

import type { ReactNode } from "react";

vi.mock("motion/react", () => {
	return {
		motion: {
			article: ({
				children,
				className,
				initial,
				variants,
				viewport,
				whileInView,
				...props
			}: {
				children: ReactNode;
				className?: string;
				initial: boolean | object | string;
				variants?: object;
				viewport?: object;
				whileInView?: object | string;
			}) => (
				<article
					className={className}
					data-initial={initial}
					data-testid="motion-article"
					data-variants={variants ? JSON.stringify(Object.keys(variants)) : undefined}
					data-viewport={viewport ? JSON.stringify(viewport) : undefined}
					data-while-in-view={whileInView}
					{...props}
				>
					{children}
				</article>
			),
			div: ({
				children,
				className,
				variants,
				...props
			}: {
				children: ReactNode;
				className?: string;
				variants?: object;
			}) => (
				<div
					className={className}
					data-testid="motion-div"
					data-variants={variants ? JSON.stringify(Object.keys(variants)) : undefined}
					{...props}
				>
					{children}
				</div>
			),
			h3: ({
				children,
				className,
				variants,
				...props
			}: {
				children: ReactNode;
				className?: string;
				variants?: object;
			}) => (
				<h3
					className={className}
					data-testid="motion-h3"
					data-variants={variants ? JSON.stringify(Object.keys(variants)) : undefined}
					{...props}
				>
					{children}
				</h3>
			),
			p: ({
				children,
				className,
				variants,
				...props
			}: {
				children: ReactNode;
				className?: string;
				variants?: object;
			}) => (
				<p
					className={className}
					data-testid="motion-p"
					data-variants={variants ? JSON.stringify(Object.keys(variants)) : undefined}
					{...props}
				>
					{children}
				</p>
			),
		},
	};
});

describe("Animated Feature Articles", () => {
	const props = {
		className: "test-class",
		featureDescription: "Test feature description text.",
		featureTitle: "Test Feature Title",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders with correct structure and content", () => {
		render(<AnimatedFeatureArticle {...props} />);

		const articleElement = screen.getByTestId("motion-article");
		expect(articleElement).toBeInTheDocument();
		expect(articleElement).toHaveClass("test-class");
		expect(articleElement).toHaveAttribute("id", "feature-item");

		const iconElement = screen.getByTestId("motion-div");
		expect(iconElement).toBeInTheDocument();
		expect(iconElement).toHaveClass(
			"border-l-12 md:border-l-10 border-r-12 md:border-r-10 border-b-20 md:border-b-16 border-b-background size-0 border-x-transparent",
		);

		const titleElement = screen.getByTestId("motion-h3");
		expect(titleElement).toBeInTheDocument();
		expect(titleElement).toHaveClass("font-heading my-5 text-2xl font-medium md:my-3");
		expect(titleElement).toHaveTextContent("Test Feature Title");

		const descriptionElement = screen.getByTestId("motion-p");
		expect(descriptionElement).toBeInTheDocument();
		expect(descriptionElement).toHaveClass("text-lg md:text-sm md:leading-tight");
		expect(descriptionElement).toHaveTextContent("Test feature description text.");
	});

	it("applies correct animation variants to all elements", () => {
		render(
			<AnimatedFeatureArticle featureDescription={props.featureDescription} featureTitle={props.featureTitle} />,
		);

		const articleElement = screen.getByTestId("motion-article");
		expect(articleElement).toHaveAttribute("data-variants", '["hidden","visible"]');

		const iconElement = screen.getByTestId("motion-div");
		expect(iconElement).toHaveAttribute("data-variants", '["hidden","visible"]');

		const titleElement = screen.getByTestId("motion-h3");
		expect(titleElement).toHaveAttribute("data-variants", '["hidden","visible"]');

		const descriptionElement = screen.getByTestId("motion-p");
		expect(descriptionElement).toHaveAttribute("data-variants", '["hidden","visible"]');
	});

	it("sets up correct animation view configuration", () => {
		render(
			<AnimatedFeatureArticle featureDescription={props.featureDescription} featureTitle={props.featureTitle} />,
		);

		const articleElement = screen.getByTestId("motion-article");

		expect(articleElement).toHaveAttribute("data-initial", "hidden");
		expect(articleElement).toHaveAttribute("data-while-in-view", "visible");

		const viewportConfig = JSON.parse(articleElement.dataset.viewport ?? "{}");
		expect(viewportConfig).toEqual({
			amount: 0.2,
			once: true,
		});
	});

	it("handles custom className properly", () => {
		render(
			<AnimatedFeatureArticle
				className={`custom-test-class extra-class ${props.className}`}
				featureDescription={props.featureDescription}
				featureTitle={props.featureTitle}
			/>,
		);

		const articleElement = screen.getByTestId("motion-article");
		expect(articleElement).toHaveClass("custom-test-class");
		expect(articleElement).toHaveClass("extra-class");
		expect(articleElement).toHaveClass("test-class");
	});

	it("renders without className when not provided", () => {
		render(
			<AnimatedFeatureArticle featureDescription={props.featureDescription} featureTitle={props.featureTitle} />,
		);

		const articleElement = screen.getByTestId("motion-article");
		expect(articleElement).not.toHaveClass("undefined");
		expect(articleElement).toHaveAttribute("id", "feature-item");
	});

	it("renders long content correctly", () => {
		const longTitle =
			"This is a very long feature title that tests how the component handles extended content in the title section";
		const longDescription =
			"This is an extremely detailed feature description with a lot of text to ensure that the component can properly display longer content without any issues. The text continues for multiple sentences to truly test the rendering capabilities.";

		render(<AnimatedFeatureArticle featureDescription={longDescription} featureTitle={longTitle} />);

		const titleElement = screen.getByTestId("motion-h3");
		expect(titleElement).toHaveTextContent(longTitle);

		const descriptionElement = screen.getByTestId("motion-p");
		expect(descriptionElement).toHaveTextContent(longDescription);
	});
});
