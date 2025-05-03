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

import { ScaleElement } from "./scale-element";

describe("ScaleElement", () => {
	beforeEach(() => {
		mockUseScroll.mockClear();
		mockUseTransform.mockClear();
	});

	it("renders children correctly", () => {
		render(
			<ScaleElement>
				<div data-testid="test-child">Test Content</div>
			</ScaleElement>,
		);

		const child = screen.getByTestId("test-child");
		expect(child).toBeInTheDocument();
		expect(child).toHaveTextContent("Test Content");
	});

	it("applies correct className", () => {
		render(
			<ScaleElement className="test-class">
				<div>Test Content</div>
			</ScaleElement>,
		);

		const motionDiv = screen.getByTestId("motion-div");
		expect(motionDiv).toHaveClass("h-full test-class");
	});

	it("sets up useScroll with correct parameters", () => {
		render(
			<ScaleElement>
				<div>Test Content</div>
			</ScaleElement>,
		);

		expect(mockUseScroll).toHaveBeenCalledWith({
			offset: ["start end", "center center"],
			target: expect.any(Object),
		});
	});

	it("applies scale and opacity styles based on scrollYProgress", () => {
		render(
			<ScaleElement>
				<div>Test Content</div>
			</ScaleElement>,
		);

		const motionDiv = screen.getByTestId("motion-div");

		const styleData = JSON.parse(motionDiv.dataset.style ?? "{}");
		expect(styleData).toHaveProperty("opacity");
		expect(styleData).toHaveProperty("scale");
	});

	it("calls useTransform twice with correct parameters for opacity and scale", () => {
		render(
			<ScaleElement>
				<div>Test Content</div>
			</ScaleElement>,
		);

		expect(mockUseTransform).toHaveBeenCalledTimes(2);

		expect(mockUseTransform).toHaveBeenNthCalledWith(1, mockScrollYProgress, [0, 0.3, 0.5], [0, 0.8, 1]);
		expect(mockUseTransform).toHaveBeenNthCalledWith(2, mockScrollYProgress, [0, 0.3, 0.5], [0.95, 0.98, 1]);
	});

	it("applies correct transition properties with custom delay", () => {
		render(
			<ScaleElement delay={0.5}>
				<div>Test Content</div>
			</ScaleElement>,
		);

		const motionDiv = screen.getByTestId("motion-div");
		const transitionData = JSON.parse(motionDiv.dataset.transition ?? "{}");

		expect(transitionData).toEqual({
			delay: 0.5,
			duration: 0.5,
			ease: "easeInOut",
		});
	});

	it("applies default delay when not specified", () => {
		render(
			<ScaleElement>
				<div>Test Content</div>
			</ScaleElement>,
		);

		const motionDiv = screen.getByTestId("motion-div");
		const transitionData = JSON.parse(motionDiv.dataset.transition ?? "{}");

		expect(transitionData).toEqual({
			delay: 0,
			duration: 0.5,
			ease: "easeInOut",
		});
	});

	it("uses internal ref for scroll tracking", () => {
		render(
			<ScaleElement>
				<div>Test Content</div>
			</ScaleElement>,
		);

		expect(mockUseScroll).toHaveBeenCalledWith(
			expect.objectContaining({
				target: expect.any(Object),
			}),
		);
	});
});
