import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Mail } from "lucide-react";
import { useState } from "react";
import { afterEach } from "vitest";

import AppInput from "./input-field";

afterEach(() => {
	cleanup();
});

describe.sequential("AppInput Component", () => {
	it("renders input element", () => {
		const { container } = render(<AppInput testId="test-input" />);

		const input = container.querySelector('[data-testid="test-input"]');
		expect(input).toBeInTheDocument();
		expect(input?.tagName).toBe("INPUT");
	});

	it("accepts and displays user input", async () => {
		const user = userEvent.setup();
		const { container } = render(<AppInput testId="test-input" />);

		const input = container.querySelector('[data-testid="test-input"]')!;
		await user.type(input, "Hello World");

		expect(input).toHaveValue("Hello World");
	});

	it("calls onChange handler when value changes", async () => {
		const handleChange = vi.fn();
		const user = userEvent.setup();

		render(<AppInput onChange={handleChange} testId="test-input" />);

		const input = screen.getByTestId("test-input");
		await user.type(input, "a");

		expect(handleChange).toHaveBeenCalled();
		expect(handleChange).toHaveBeenCalledWith(
			expect.objectContaining({
				target: expect.objectContaining({ value: "a" }),
			}),
		);
	});

	it("displays error message when validation fails", () => {
		render(<AppInput errorMessage="This field is required" testId="test-input" />);

		const errorMessage = screen.getByTestId("test-input-error");
		expect(errorMessage).toHaveTextContent("This field is required");
		expect(errorMessage).toBeVisible();
	});

	it("prevents input when disabled", async () => {
		const handleChange = vi.fn();
		const user = userEvent.setup();

		render(<AppInput disabled onChange={handleChange} testId="test-input" />);

		const input = screen.getByTestId("test-input");
		expect(input).toBeDisabled();

		await user.type(input, "test");
		expect(handleChange).not.toHaveBeenCalled();
	});

	it("displays label when provided", () => {
		const { container } = render(<AppInput label="Email Address" testId="test-input" />);

		const label = container.querySelector('[data-testid="test-input-label"]');
		expect(label).toHaveTextContent("Email Address");
	});

	it("renders icon when provided", () => {
		const { container } = render(<AppInput icon={<Mail data-testid="mail-icon" />} testId="test-input" />);

		const icon = container.querySelector('[data-testid="mail-icon"]');
		expect(icon).toBeInTheDocument();
	});

	describe("Character Counting", () => {
		it("displays character count when enabled", async () => {
			const user = userEvent.setup();
			render(<AppInput countType="chars" showCount testId="test-input" />);

			const charCount = screen.getByTestId("test-input-chars-count");
			expect(charCount).toHaveTextContent("00");

			const input = screen.getByTestId("test-input");
			await user.type(input, "Hello");
			expect(charCount).toHaveTextContent("05");
		});

		it("enforces maxLength when character limit is set", async () => {
			const user = userEvent.setup();
			render(<AppInput countType="chars" maxCount={5} testId="test-input" />);

			const input = screen.getByTestId("test-input");
			expect(input).toHaveAttribute("maxLength", "5");

			await user.type(input, "Hello World");
			expect(input).toHaveValue("Hello");
		});

		it("shows max character count when limit is set", () => {
			render(<AppInput countType="chars" maxCount={50} showCount testId="test-input" />);

			const charCount = screen.getByTestId("test-input-chars-count");
			expect(charCount).toHaveTextContent("00/50");
		});
	});

	describe("Word Counting", () => {
		it("counts words correctly", async () => {
			const user = userEvent.setup();
			render(<AppInput countType="words" showCount testId="test-input" />);

			const wordCount = screen.getByTestId("test-input-words-count");
			const input = screen.getByTestId("test-input");

			expect(wordCount).toHaveTextContent("00");

			await user.type(input, "Hello World");
			expect(wordCount).toHaveTextContent("02");

			await user.clear(input);
			await user.type(input, "   multiple   spaces   ");
			expect(wordCount).toHaveTextContent("02");
		});

		it("does not enforce maxLength for word counting", () => {
			render(<AppInput countType="words" maxCount={10} testId="test-input" />);

			const input = screen.getByTestId("test-input");
			expect(input).not.toHaveAttribute("maxLength");
		});
	});

	it("works as controlled component", async () => {
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

	it("forwards input attributes correctly", () => {
		render(<AppInput autoComplete="email" placeholder="Enter email" required testId="test-input" type="email" />);

		const input = screen.getByTestId("test-input");
		expect(input).toHaveAttribute("placeholder", "Enter email");
		expect(input).toHaveAttribute("type", "email");
		expect(input).toHaveAttribute("autoComplete", "email");
		expect(input).toHaveAttribute("required");
	});

	describe("Count Type Tag", () => {
		it("displays Characters tag when showCountTypeTag is true with chars countType", () => {
			render(<AppInput countType="chars" showCountTypeTag testId="test-input" />);

			const tag = screen.getByText("Characters");
			expect(tag).toBeInTheDocument();
			expect(tag.parentElement).toHaveAttribute("data-type", "Characters");
		});

		it("displays Words tag when showCountTypeTag is true with words countType", () => {
			render(<AppInput countType="words" showCountTypeTag testId="test-input" />);

			const tag = screen.getByText("Words");
			expect(tag).toBeInTheDocument();
			expect(tag.parentElement).toHaveAttribute("data-type", "Words");
		});

		it("does not display tag when showCountTypeTag is false", () => {
			render(<AppInput countType="chars" showCountTypeTag={false} testId="test-input" />);

			expect(screen.queryByText("Characters")).not.toBeInTheDocument();
		});

		it("hides icon when showCountTypeTag is true", () => {
			const { container } = render(
				<AppInput icon={<Mail data-testid="mail-icon" />} showCountTypeTag testId="test-input" />,
			);

			expect(container.querySelector('[data-testid="mail-icon"]')).not.toBeInTheDocument();
			expect(screen.getByText("Characters")).toBeInTheDocument();
		});

		it("shows icon when showCountTypeTag is false", () => {
			const { container } = render(
				<AppInput icon={<Mail data-testid="mail-icon" />} showCountTypeTag={false} testId="test-input" />,
			);

			expect(container.querySelector('[data-testid="mail-icon"]')).toBeInTheDocument();
			expect(screen.queryByText("Characters")).not.toBeInTheDocument();
		});
	});

	describe("Number Input Restrictions", () => {
		it("limits number input to 7 digits", async () => {
			const user = userEvent.setup();
			const handleChange = vi.fn();

			render(<AppInput onChange={handleChange} testId="test-input" type="number" />);

			const input = screen.getByTestId("test-input");
			await user.type(input, "12345678");

			expect(input).toHaveValue(1_234_567);
			expect(handleChange).toHaveBeenCalledTimes(7);
		});

		it("allows non-number inputs to exceed 7 characters", async () => {
			const user = userEvent.setup();

			render(<AppInput testId="test-input" type="text" />);

			const input = screen.getByTestId("test-input");
			await user.type(input, "12345678");

			expect(input).toHaveValue("12345678");
		});
	});
});
