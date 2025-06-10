import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import AppTextarea from "./textarea-field";

describe("AppTextarea Component", () => {
	it("renders correctly with default props", () => {
		render(<AppTextarea testId="test-textarea" />);

		const textarea = screen.getByTestId("test-textarea");
		expect(textarea).toBeInTheDocument();
	});

	it("displays the placeholder text", () => {
		render(<AppTextarea placeholder="Enter your message" testId="test-textarea" />);

		const textarea = screen.getByTestId("test-textarea");
		expect(textarea).toHaveAttribute("placeholder", "Enter your message");
	});

	it("updates value when user types", async () => {
		const user = userEvent.setup();
		render(<AppTextarea testId="test-textarea" />);

		const textarea = screen.getByTestId("test-textarea");
		await user.type(textarea, "Hello World");

		expect(textarea).toHaveValue("Hello World");
	});

	it("shows error message when provided", () => {
		render(<AppTextarea errorMessage="This field is required" testId="test-textarea" />);

		const errorMessage = screen.getByTestId("test-textarea-error");
		expect(errorMessage).toHaveTextContent("This field is required");
		expect(errorMessage).toBeInTheDocument();
	});

	it("applies disabled styles when disabled", () => {
		render(<AppTextarea disabled testId="test-textarea" />);

		const textarea = screen.getByTestId("test-textarea");
		expect(textarea).toBeDisabled();
	});

	it("calls onChange handler when value changes", async () => {
		const handleChange = vi.fn();
		const user = userEvent.setup();

		render(<AppTextarea onChange={handleChange} testId="test-textarea" />);

		const textarea = screen.getByTestId("test-textarea");
		await user.type(textarea, "a");

		expect(handleChange).toHaveBeenCalled();
	});

	it("applies custom className correctly", () => {
		render(<AppTextarea className="custom-class" testId="test-textarea" />);

		const textarea = screen.getByTestId("test-textarea");
		expect(textarea).toHaveClass("custom-class");
	});

	it("renders with different variants", () => {
		const { rerender } = render(<AppTextarea testId="test-textarea" variant="field" />);

		let textarea = screen.getByTestId("test-textarea");
		expect(textarea).toHaveClass("ring-1");
		expect(textarea).toHaveClass("ring-input-border");

		rerender(<AppTextarea testId="test-textarea" variant="default" />);

		textarea = screen.getByTestId("test-textarea");
		expect(textarea).not.toHaveClass("ring-1");
		expect(textarea).not.toHaveClass("ring-input-border");
	});

	it("displays label when label prop is provided", () => {
		render(<AppTextarea label="Description" testId="test-textarea" />);

		const label = screen.getByTestId("test-textarea-label");
		expect(label).toBeInTheDocument();
		expect(label).toHaveTextContent("Description");
	});

	it("changes label color when errorMessage is provided", () => {
		render(<AppTextarea errorMessage="This field is required" label="Description" testId="test-textarea" />);

		const label = screen.getByTestId("test-textarea-label");
		expect(label).toHaveClass("text-error");
		expect(label).not.toHaveClass("text-foreground");
	});

	describe("Character Counting", () => {
		it("displays character count when showCount is true with countType='chars'", () => {
			render(<AppTextarea countType="chars" showCount testId="test-textarea" />);

			const charCount = screen.getByTestId("test-textarea-chars-count");
			expect(charCount).toBeInTheDocument();
			expect(charCount).toHaveTextContent("0");
		});

		it("formats character count correctly", async () => {
			const user = userEvent.setup();
			render(<AppTextarea countType="chars" showCount testId="test-textarea" />);

			const charCount = screen.getByTestId("test-textarea-chars-count");
			const textarea = screen.getByTestId("test-textarea");

			expect(charCount).toHaveTextContent("0");

			await user.type(textarea, "Hello");
			expect(charCount).toHaveTextContent("5");

			await user.type(textarea, " World!");
			expect(charCount).toHaveTextContent("12");
		});

		it("shows max character count when maxCount is provided", () => {
			render(<AppTextarea countType="chars" maxCount={500} showCount testId="test-textarea" />);

			const charCount = screen.getByTestId("test-textarea-chars-count");
			expect(charCount).toHaveTextContent("0/500");
		});

		it("applies maxLength attribute when countType is 'chars'", () => {
			render(<AppTextarea countType="chars" maxCount={100} testId="test-textarea" />);

			const textarea = screen.getByTestId("test-textarea");
			expect(textarea).toHaveAttribute("maxLength", "100");
		});

		it("changes count color when errorMessage is provided", () => {
			render(
				<AppTextarea countType="chars" errorMessage="Too many characters" showCount testId="test-textarea" />,
			);

			const charCount = screen.getByTestId("test-textarea-chars-count");
			expect(charCount).toHaveClass("text-error");
		});

		it("handles multiline text correctly", async () => {
			const user = userEvent.setup();
			render(<AppTextarea countType="chars" showCount testId="test-textarea" />);

			const charCount = screen.getByTestId("test-textarea-chars-count");
			const textarea = screen.getByTestId("test-textarea");

			await user.type(textarea, "Line 1{Enter}Line 2{Enter}Line 3");
			const expectedLength = "Line 1\nLine 2\nLine 3".length;
			expect(charCount).toHaveTextContent(expectedLength.toString());
		});
	});

	describe("Word Counting", () => {
		it("displays word count when showCount is true with countType='words'", () => {
			render(<AppTextarea countType="words" showCount testId="test-textarea" />);

			const wordCount = screen.getByTestId("test-textarea-words-count");
			expect(wordCount).toBeInTheDocument();
			expect(wordCount).toHaveTextContent("0");
		});

		it("counts words correctly", async () => {
			const user = userEvent.setup();
			render(<AppTextarea countType="words" showCount testId="test-textarea" />);

			const wordCount = screen.getByTestId("test-textarea-words-count");
			const textarea = screen.getByTestId("test-textarea");

			expect(wordCount).toHaveTextContent("0");

			await user.type(textarea, "Hello");
			expect(wordCount).toHaveTextContent("1");

			await user.type(textarea, " World");
			expect(wordCount).toHaveTextContent("2");

			await user.type(textarea, "   multiple   spaces   ");
			expect(wordCount).toHaveTextContent("4");
		});

		it("shows max word count when maxCount is provided", () => {
			render(<AppTextarea countType="words" maxCount={200} showCount testId="test-textarea" />);

			const wordCount = screen.getByTestId("test-textarea-words-count");
			expect(wordCount).toHaveTextContent("0/200");
		});

		it("does not apply maxLength attribute when countType is 'words'", () => {
			render(<AppTextarea countType="words" maxCount={50} testId="test-textarea" />);

			const textarea = screen.getByTestId("test-textarea");
			expect(textarea).not.toHaveAttribute("maxLength");
		});

		it("handles empty and whitespace-only input correctly", async () => {
			const user = userEvent.setup();
			render(<AppTextarea countType="words" showCount testId="test-textarea" />);

			const wordCount = screen.getByTestId("test-textarea-words-count");
			const textarea = screen.getByTestId("test-textarea");

			await user.type(textarea, "   ");
			expect(wordCount).toHaveTextContent("0");

			await user.clear(textarea);
			await user.type(textarea, "\t\n ");
			expect(wordCount).toHaveTextContent("0");
		});

		it("counts words correctly with multiline text", async () => {
			const user = userEvent.setup();
			render(<AppTextarea countType="words" showCount testId="test-textarea" />);

			const wordCount = screen.getByTestId("test-textarea-words-count");
			const textarea = screen.getByTestId("test-textarea");

			await user.type(textarea, "Line one{Enter}Line two{Enter}Line three");
			expect(wordCount).toHaveTextContent("6");
		});
	});

	it("defaults to character counting when countType is not specified", () => {
		render(<AppTextarea maxCount={1000} showCount testId="test-textarea" />);

		const charCount = screen.getByTestId("test-textarea-chars-count");
		expect(charCount).toBeInTheDocument();
	});

	it("applies different text color to count when textarea is disabled", () => {
		render(<AppTextarea countType="chars" disabled showCount testId="test-textarea" />);

		const charCount = screen.getByTestId("test-textarea-chars-count");
		expect(charCount).toHaveClass("text-input-muted");
		expect(charCount).not.toHaveClass("text-muted-foreground");
	});

	it("controlled component behavior works correctly", async () => {
		const ControlledTextarea = () => {
			const [value, setValue] = useState("initial content");
			return <AppTextarea onChange={(e) => setValue(e.target.value)} testId="test-textarea" value={value} />;
		};

		render(<ControlledTextarea />);
		const textarea = screen.getByTestId("test-textarea");

		expect(textarea).toHaveValue("initial content");

		const user = userEvent.setup();
		await user.clear(textarea);
		await user.type(textarea, "updated content");

		expect(textarea).toHaveValue("updated content");
	});

	it("handles long text content appropriately", async () => {
		const user = userEvent.setup();
		const longText = "Lorem ipsum ".repeat(50);

		render(<AppTextarea countType="chars" maxCount={500} showCount testId="test-textarea" />);

		const textarea = screen.getByTestId("test-textarea");
		const charCount = screen.getByTestId("test-textarea-chars-count");

		await user.type(textarea, longText);

		const actualLength = Math.min(longText.length, 500);
		expect(textarea).toHaveValue(longText.slice(0, Math.max(0, actualLength)));
		expect(charCount).toHaveTextContent(`${actualLength}/500`);
	});

	it("textarea should grow with content (min-height is applied)", () => {
		render(<AppTextarea testId="test-textarea" />);

		const textarea = screen.getByTestId("test-textarea");
		expect(textarea).toHaveClass("min-h-[80px]");
	});

	it("applies border error class when errorMessage is provided", () => {
		render(<AppTextarea errorMessage="This field has an error" testId="test-textarea" />);

		const textarea = screen.getByTestId("test-textarea");
		expect(textarea).toHaveClass("border-error");
	});

	it("renders additional props correctly", () => {
		render(<AppTextarea cols={40} rows={5} testId="test-textarea" />);

		const textarea = screen.getByTestId("test-textarea");
		expect(textarea).toHaveAttribute("cols", "40");
		expect(textarea).toHaveAttribute("rows", "5");
	});
});
