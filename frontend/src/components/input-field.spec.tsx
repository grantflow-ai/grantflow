import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Mail } from "lucide-react";
import { useState } from "react";

import AppInput from "./input-field";

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

	describe("Character Counting", () => {
		it("displays character count when showCount is true with countType='chars'", () => {
			render(<AppInput countType="chars" showCount testId="test-input" />);

			const charCount = screen.getByTestId("test-input-chars-count");
			expect(charCount).toBeInTheDocument();
			expect(charCount).toHaveTextContent("00");
		});

		it("formats character count with leading zero for single digits", async () => {
			const user = userEvent.setup();
			render(<AppInput countType="chars" showCount testId="test-input" />);

			const charCount = screen.getByTestId("test-input-chars-count");
			const input = screen.getByTestId("test-input");

			expect(charCount).toHaveTextContent("00");

			await user.type(input, "Hello");
			expect(charCount).toHaveTextContent("05");

			await user.type(input, " World!");
			expect(charCount).toHaveTextContent("12");
		});

		it("shows max character count when maxCount is provided", () => {
			render(<AppInput countType="chars" maxCount={50} showCount testId="test-input" />);

			const charCount = screen.getByTestId("test-input-chars-count");
			expect(charCount).toHaveTextContent("00/50");
		});

		it("applies maxLength attribute when countType is 'chars'", () => {
			render(<AppInput countType="chars" maxCount={10} testId="test-input" />);

			const input = screen.getByTestId("test-input");
			expect(input).toHaveAttribute("maxLength", "10");
		});

		it("changes count color when errorMessage is provided", () => {
			render(<AppInput countType="chars" errorMessage="Too many characters" showCount testId="test-input" />);

			const charCount = screen.getByTestId("test-input-chars-count");
			expect(charCount).toHaveClass("text-error");
		});
	});

	describe("Word Counting", () => {
		it("displays word count when showCount is true with countType='words'", () => {
			render(<AppInput countType="words" showCount testId="test-input" />);

			const wordCount = screen.getByTestId("test-input-words-count");
			expect(wordCount).toBeInTheDocument();
			expect(wordCount).toHaveTextContent("00");
		});

		it("counts words correctly", async () => {
			const user = userEvent.setup();
			render(<AppInput countType="words" showCount testId="test-input" />);

			const wordCount = screen.getByTestId("test-input-words-count");
			const input = screen.getByTestId("test-input");

			expect(wordCount).toHaveTextContent("00");

			await user.type(input, "Hello");
			expect(wordCount).toHaveTextContent("01");

			await user.type(input, " World");
			expect(wordCount).toHaveTextContent("02");

			await user.type(input, "   multiple   spaces   ");
			expect(wordCount).toHaveTextContent("04");
		});

		it("shows max word count when maxCount is provided", () => {
			render(<AppInput countType="words" maxCount={20} showCount testId="test-input" />);

			const wordCount = screen.getByTestId("test-input-words-count");
			expect(wordCount).toHaveTextContent("00/20");
		});

		it("does not apply maxLength attribute when countType is 'words'", () => {
			render(<AppInput countType="words" maxCount={10} testId="test-input" />);

			const input = screen.getByTestId("test-input");
			expect(input).not.toHaveAttribute("maxLength");
		});

		it("handles empty and whitespace-only input correctly", async () => {
			const user = userEvent.setup();
			render(<AppInput countType="words" showCount testId="test-input" />);

			const wordCount = screen.getByTestId("test-input-words-count");
			const input = screen.getByTestId("test-input");

			await user.type(input, "   ");
			expect(wordCount).toHaveTextContent("00");

			await user.clear(input);
			await user.type(input, "\t\n ");
			expect(wordCount).toHaveTextContent("00");
		});
	});

	it("defaults to character counting when countType is not specified", () => {
		render(<AppInput maxCount={100} showCount testId="test-input" />);

		const charCount = screen.getByTestId("test-input-chars-count");
		expect(charCount).toBeInTheDocument();
	});

	it("should have autoFocus disabled by default", () => {
		render(<AppInput testId="test-input" />);

		const input = screen.getByTestId("test-input");
		expect(input).not.toHaveFocus();
		expect(input).not.toHaveAttribute("autoFocus");
	});

	it("applies different text color to count when input is disabled", () => {
		render(<AppInput countType="chars" disabled showCount testId="test-input" />);

		const charCount = screen.getByTestId("test-input-chars-count");
		expect(charCount).toHaveClass("text-input-muted");
		expect(charCount).not.toHaveClass("text-input-label");
	});

	it("controlled component behavior works correctly", async () => {
		const ControlledInput = () => {
			const [value, setValue] = useState("initial");
			return <AppInput onChange={(e) => setValue(e.target.value)} testId="test-input" value={value} />;
		};

		render(<ControlledInput />);
		const input = screen.getByTestId("test-input");

		expect(input).toHaveValue("initial");

		const user = userEvent.setup();
		await user.clear(input);
		await user.type(input, "updated");

		expect(input).toHaveValue("updated");
	});
});
