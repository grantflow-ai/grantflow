import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import AppTextarea from "./textarea-field";

describe("AppTextarea Component", () => {
	it("renders textarea element", () => {
		render(<AppTextarea testId="test-textarea" />);

		const textarea = screen.getByTestId("test-textarea");
		expect(textarea).toBeInTheDocument();
		expect(textarea.tagName).toBe("TEXTAREA");
	});

	it("accepts and displays user input", async () => {
		const user = userEvent.setup();
		render(<AppTextarea testId="test-textarea" />);

		const textarea = screen.getByTestId("test-textarea");
		await user.type(textarea, "Hello World");

		expect(textarea).toHaveValue("Hello World");
	});

	it("handles multiline input", async () => {
		const user = userEvent.setup();
		render(<AppTextarea testId="test-textarea" />);

		const textarea = screen.getByTestId("test-textarea");
		await user.type(textarea, "Line 1{Enter}Line 2{Enter}Line 3");

		expect(textarea).toHaveValue("Line 1\nLine 2\nLine 3");
	});

	it("calls onChange handler when value changes", async () => {
		const handleChange = vi.fn();
		const user = userEvent.setup();

		render(<AppTextarea onChange={handleChange} testId="test-textarea" />);

		const textarea = screen.getByTestId("test-textarea");
		await user.type(textarea, "a");

		expect(handleChange).toHaveBeenCalled();
		expect(handleChange).toHaveBeenCalledWith(
			expect.objectContaining({
				target: expect.objectContaining({ value: "a" }),
			}),
		);
	});

	it("displays error message when validation fails", () => {
		render(<AppTextarea errorMessage="This field is required" testId="test-textarea" />);

		const errorMessage = screen.getByTestId("test-textarea-error");
		expect(errorMessage).toHaveTextContent("This field is required");
		expect(errorMessage).toBeVisible();
	});

	it("prevents input when disabled", async () => {
		const handleChange = vi.fn();
		const user = userEvent.setup();

		render(<AppTextarea disabled onChange={handleChange} testId="test-textarea" />);

		const textarea = screen.getByTestId("test-textarea");
		expect(textarea).toBeDisabled();

		await user.type(textarea, "test");
		expect(handleChange).not.toHaveBeenCalled();
	});

	it("displays label when provided", () => {
		render(<AppTextarea label="Description" testId="test-textarea" />);

		const label = screen.getByTestId("test-textarea-label");
		expect(label).toHaveTextContent("Description");
	});

	describe("Character Counting", () => {
		it("displays character count when enabled", async () => {
			const user = userEvent.setup();
			render(<AppTextarea countType="chars" showCount testId="test-textarea" />);

			const charCount = screen.getByTestId("test-textarea-chars-count");
			expect(charCount).toHaveTextContent("0");

			const textarea = screen.getByTestId("test-textarea");
			await user.type(textarea, "Hello");
			expect(charCount).toHaveTextContent("5");

			// Test multiline counting
			await user.type(textarea, "{Enter}World");
			expect(charCount).toHaveTextContent("11"); // "Hello\nWorld"
		});

		it("enforces maxLength when character limit is set", async () => {
			const user = userEvent.setup();
			render(<AppTextarea countType="chars" maxCount={10} testId="test-textarea" />);

			const textarea = screen.getByTestId("test-textarea");
			expect(textarea).toHaveAttribute("maxLength", "10");

			await user.type(textarea, "Hello World and more");
			expect(textarea).toHaveValue("Hello Worl"); // Only first 10 characters
		});

		it("shows max character count when limit is set", () => {
			render(<AppTextarea countType="chars" maxCount={500} showCount testId="test-textarea" />);

			const charCount = screen.getByTestId("test-textarea-chars-count");
			expect(charCount).toHaveTextContent("0/500");
		});
	});

	describe("Word Counting", () => {
		it("counts words correctly", async () => {
			const user = userEvent.setup();
			render(<AppTextarea countType="words" showCount testId="test-textarea" />);

			const wordCount = screen.getByTestId("test-textarea-words-count");
			const textarea = screen.getByTestId("test-textarea");

			expect(wordCount).toHaveTextContent("0");

			await user.type(textarea, "Hello World");
			expect(wordCount).toHaveTextContent("2");

			// Test with extra spaces
			await user.clear(textarea);
			await user.type(textarea, "   multiple   spaces   ");
			expect(wordCount).toHaveTextContent("2");

			// Test multiline
			await user.clear(textarea);
			await user.type(textarea, "Line one{Enter}Line two{Enter}Line three");
			expect(wordCount).toHaveTextContent("6");
		});

		it("does not enforce maxLength for word counting", () => {
			render(<AppTextarea countType="words" maxCount={50} testId="test-textarea" />);

			const textarea = screen.getByTestId("test-textarea");
			expect(textarea).not.toHaveAttribute("maxLength");
		});

		it("handles empty and whitespace-only input", async () => {
			const user = userEvent.setup();
			render(<AppTextarea countType="words" showCount testId="test-textarea" />);

			const wordCount = screen.getByTestId("test-textarea-words-count");
			const textarea = screen.getByTestId("test-textarea");

			await user.type(textarea, "   \n\t ");
			expect(wordCount).toHaveTextContent("0");
		});
	});

	it("works as controlled component", async () => {
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

	it("forwards textarea attributes correctly", () => {
		render(
			<AppTextarea
				autoComplete="off"
				cols={40}
				placeholder="Enter description"
				required
				rows={5}
				testId="test-textarea"
			/>,
		);

		const textarea = screen.getByTestId("test-textarea");
		expect(textarea).toHaveAttribute("cols", "40");
		expect(textarea).toHaveAttribute("rows", "5");
		expect(textarea).toHaveAttribute("placeholder", "Enter description");
		expect(textarea).toHaveAttribute("autoComplete", "off");
		expect(textarea).toHaveAttribute("required");
	});
});
