import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Mail } from "lucide-react"; // Assuming you might use Lucide icons

import { AppInput } from "@/components/input-field";

describe("AppInput Component", () => {
	it("renders correctly with default props", () => {
		render(<AppInput testId="test-input" />);

		const input = screen.getByTestId("test-input");
		expect(input).toBeInTheDocument();
	});

	it("displays the placeholder text", () => {
		render(<AppInput placeholder="Enter your name" testId="test-input" />);

		const input = screen.getByTestId("test-input");
		expect(input).toHaveAttribute("placeholder", "Enter your name");
	});

	it("updates value when user types", async () => {
		const user = userEvent.setup();
		render(<AppInput testId="test-input" />);

		const input = screen.getByTestId("test-input");
		await user.type(input, "Hello World");

		expect(input).toHaveValue("Hello World");
	});

	it("shows error message when provided", () => {
		render(<AppInput errorMessage="This field is required" testId="test-input" />);

		const errorMessage = screen.getByTestId("test-input-error");
		expect(errorMessage).toHaveTextContent("This field is required");
		expect(errorMessage).toBeVisible();
	});

	it("renders with an icon when provided", () => {
		render(<AppInput icon={<Mail data-testid="mail-icon" />} testId="test-input" />);

		const icon = screen.getByTestId("mail-icon");
		expect(icon).toBeInTheDocument();
	});

	it("applies disabled styles when disabled", () => {
		render(<AppInput disabled testId="test-input" />);

		const input = screen.getByTestId("test-input");
		expect(input).toBeDisabled();
	});

	it("calls onChange handler when value changes", async () => {
		const handleChange = vi.fn();
		const user = userEvent.setup();

		render(<AppInput onChange={handleChange} testId="test-input" />);

		const input = screen.getByTestId("test-input");
		await user.type(input, "a");

		expect(handleChange).toHaveBeenCalled();
	});

	it("applies custom className correctly", () => {
		render(<AppInput className="custom-class" testId="test-input" />);

		const input = screen.getByTestId("test-input");
		expect(input).toHaveClass("custom-class");
	});

	it("renders with different variants", () => {
		const { rerender } = render(<AppInput testId="test-input" variant="field" />);

		let input = screen.getByTestId("test-input");
		expect(input).toHaveClass("ring-1");
		expect(input).toHaveClass("ring-input-border");

		rerender(<AppInput testId="test-input" variant="default" />);

		input = screen.getByTestId("test-input");
		expect(input).not.toHaveClass("ring-1");
		expect(input).not.toHaveClass("ring-input-border");
	});

	it("applies correct props on icon's div when input is disabled", () => {
		render(<AppInput disabled icon={<Mail data-testid="mail-icon" />} testId="test-input" />);

		const iconContainer = screen.getByTestId("mail-icon").closest("div");
		expect(iconContainer).toHaveClass("text-input-muted");
	});

	it("displays label when label prop is provided", () => {
		render(<AppInput label="Email Address" testId="test-input" />);

		const label = screen.getByTestId("test-input-label");
		expect(label).toBeInTheDocument();
		expect(label).toHaveTextContent("Email Address");
	});

	it("changes label color when errorMessage is provided", () => {
		render(<AppInput errorMessage="This field is required" label="Email Address" testId="test-input" />);

		const label = screen.getByTestId("test-input-label");
		expect(label).toHaveClass("text-error");
		expect(label).not.toHaveClass("text-input-label");
	});

	it("changes wordCount color when errorMessage is provided", () => {
		render(<AppInput errorMessage="This field is required" showWordCount testId="test-input" />);

		const wordCount = screen.getByTestId("test-input-word-count");
		expect(wordCount).toHaveClass("text-error");
	});

	it("formats wordCount to be two digits (with leading zero if needed)", async () => {
		const user = userEvent.setup();
		render(<AppInput showWordCount testId="test-input" />);

		const wordCount = screen.getByTestId("test-input-word-count");

		expect(wordCount).toHaveTextContent("00");

		const input = screen.getByTestId("test-input");
		await user.type(input, "Hello");
		expect(wordCount).toHaveTextContent("01");

		await user.clear(input);
		await user.type(
			input,
			"This is a test with more than ten words so we can see the formatting without leading zeros",
		);
		expect(wordCount).toHaveTextContent(/^\d{2}$/);
	});

	it("shows formatted maxWords only when maxWords prop is provided", () => {
		const { rerender } = render(<AppInput showWordCount testId="test-input" />);

		const wordCount = screen.getByTestId("test-input-word-count");
		expect(wordCount).toHaveTextContent(/^\d{2}$/);
		expect(wordCount).not.toHaveTextContent(/\//);

		rerender(<AppInput maxWords={20} showWordCount testId="test-input" />);

		expect(wordCount).toHaveTextContent(/^\d{2}\/20$/);
	});

	it("displays word count when showWordCount is true", () => {
		const { rerender } = render(<AppInput testId="test-input" />);

		expect(screen.queryByTestId("test-input-word-count")).not.toBeInTheDocument();

		rerender(<AppInput showWordCount testId="test-input" />);

		expect(screen.getByTestId("test-input-word-count")).toBeInTheDocument();
	});

	it("should have autoFocus disabled by default", () => {
		render(<AppInput testId="test-input" />);

		const input = screen.getByTestId("test-input");
		expect(input).not.toHaveFocus();
		expect(input).not.toHaveAttribute("autoFocus");
	});

	it("applies different text color to wordCount when input is disabled", () => {
		render(<AppInput disabled showWordCount testId="test-input" />);

		const wordCount = screen.getByTestId("test-input-word-count");
		expect(wordCount).toHaveClass("text-input-muted");
		expect(wordCount).not.toHaveClass("text-input-label");
	});
});
