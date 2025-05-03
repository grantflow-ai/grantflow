import { render, screen } from "@testing-library/react";

const mockScrollYProgress = { get: () => 0.3, onChange: vi.fn() };
const mockUseScroll = vi.fn().mockReturnValue({ scrollYProgress: mockScrollYProgress });
const mockUseTransform = vi.fn().mockReturnValue({ get: () => 0.8, onChange: vi.fn() });

vi.mock("motion/react", () => {
	return {
		motion: {
			div: ({
				children,
				className,
				ref,
				style,
				transition,
			}: {
				[key: string]: any;
				children: React.ReactNode;
				className?: string;
				ref?: React.RefObject<HTMLDivElement>;
				style?: {
					[key: string]: any;
					opacity?: any;
					scale?: any;
					y?: any;
				};
				transition?: {
					[key: string]: any;
					delay?: number;
					duration?: number;
					ease?: string;
				};
			}) => (
				<div
					className={className}
					data-style={JSON.stringify(style)}
					data-testid="motion-div"
					data-transition={JSON.stringify(transition)}
					ref={ref}
				>
					{children}
				</div>
			),
		},
		useScroll: (args: { offset: [string, string]; target: React.RefObject<HTMLElement> }) => {
			mockUseScroll(args);
			return { scrollYProgress: mockScrollYProgress };
		},
		useTransform: (
			progress: { get: () => number; onChange: (callback: (v: number) => void) => () => void },
			inputRange: number[],
			outputRange: number[],
		) => {
			mockUseTransform(progress, inputRange, outputRange);
			return { get: () => 0.8, onChange: vi.fn() };
		},
	};
});

import { ScrollFadeElement } from "./scroll-fade-element";

describe("ScrollFadeElement", () => {
	beforeEach(() => {
		mockUseScroll.mockClear();
		mockUseTransform.mockClear();
	});

	it("renders children correctly", () => {
		render(
			<ScrollFadeElement>
				<div data-testid="test-child">Test Content</div>
			</ScrollFadeElement>,
		);

		const child = screen.getByTestId("test-child");
		expect(child).toBeInTheDocument();
		expect(child).toHaveTextContent("Test Content");
	});

	it("applies correct className", () => {
		render(
			<ScrollFadeElement className="test-class">
				<div>Test Content</div>
			</ScrollFadeElement>,
		);

		const motionDiv = screen.getByTestId("motion-div");
		expect(motionDiv).toHaveClass("test-class");
	});

	it("sets up useScroll with correct parameters", () => {
		render(
			<ScrollFadeElement>
				<div>Test Content</div>
			</ScrollFadeElement>,
		);

		expect(mockUseScroll).toHaveBeenCalledWith({
			offset: ["start end", "end start"],
			target: expect.any(Object),
		});
	});

	it("applies correct style and transition props", () => {
		render(
			<ScrollFadeElement delay={0.3}>
				<div>Test Content</div>
			</ScrollFadeElement>,
		);

		const motionDiv = screen.getByTestId("motion-div");

		const styleData = JSON.parse(motionDiv.dataset.style ?? "{}");
		expect(styleData).toHaveProperty("opacity");
		expect(styleData).toHaveProperty("y");

		const transitionData = JSON.parse(motionDiv.dataset.transition ?? "{}");
		expect(transitionData).toEqual({
			delay: 0.3,
			duration: 0.5,
			ease: "easeInOut",
		});
	});

	it("calls useTransform twice with correct parameters", () => {
		render(
			<ScrollFadeElement threshold={0.4}>
				<div>Test Content</div>
			</ScrollFadeElement>,
		);

		expect(mockUseTransform).toHaveBeenCalledTimes(2);

		expect(mockUseTransform).toHaveBeenNthCalledWith(
			1,
			mockScrollYProgress,
			[0, 0.4, 0.5, 0.75, 1],
			[0, 0, 0.8, 1, 0],
		);

		expect(mockUseTransform).toHaveBeenNthCalledWith(
			2,
			mockScrollYProgress,
			[0, 0.4, 0.5, 0.75, 1],
			[20, 10, 0, 0, -20],
		);
	});

	it("uses default threshold when not specified", () => {
		render(
			<ScrollFadeElement>
				<div>Test Content</div>
			</ScrollFadeElement>,
		);

		expect(mockUseTransform).toHaveBeenNthCalledWith(
			1,
			mockScrollYProgress,
			[0, 0.1, 0.2, 0.75, 1],
			[0, 0, 0.8, 1, 0],
		);
	});
});
