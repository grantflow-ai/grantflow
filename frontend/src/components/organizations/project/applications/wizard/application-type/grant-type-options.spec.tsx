import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GRANT_TYPE_OPTIONS, GrantTypeCard } from "./grant-type-options";

describe.sequential("GrantTypeCard", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders with all grant type options data", () => {
		expect(GRANT_TYPE_OPTIONS).toHaveLength(2);

		expect(GRANT_TYPE_OPTIONS[0]).toMatchObject({
			label: "Basic Science",
			value: "RESEARCH",
		});

		expect(GRANT_TYPE_OPTIONS[1]).toMatchObject({
			label: "Translational Research",
			value: "TRANSLATIONAL",
		});
	});

	it("renders card with option details", () => {
		const handleSelect = vi.fn();
		const [option] = GRANT_TYPE_OPTIONS;

		render(<GrantTypeCard onSelect={handleSelect} option={option!} />);

		const card = screen.getByTestId("grant-type-card-basic-science");
		expect(card).toBeInTheDocument();

		expect(card).toHaveTextContent("Basic Science");
		expect(card).toHaveTextContent("Explores fundamental principles and biological mechanisms.");

		const image = screen.getByAltText("Basic Science illustration");
		expect(image).toBeInTheDocument();
	});

	it("calls onSelect when card is clicked", async () => {
		const handleSelect = vi.fn();
		const user = userEvent.setup();
		const [option] = GRANT_TYPE_OPTIONS;

		render(<GrantTypeCard onSelect={handleSelect} option={option!} />);

		const card = screen.getByTestId("grant-type-card-basic-science");
		await user.click(card);

		expect(handleSelect).toHaveBeenCalledTimes(1);
	});

	it("updates visual state when clicked", async () => {
		const handleSelect = vi.fn();
		const user = userEvent.setup();
		const [, option] = GRANT_TYPE_OPTIONS;

		render(<GrantTypeCard onSelect={handleSelect} option={option!} />);

		const card = screen.getByTestId("grant-type-card-translational-research");

		expect(card).toHaveAttribute("aria-pressed", "false");

		await user.click(card);

		expect(card).toHaveAttribute("aria-pressed", "true");
	});

	it("does not call onSelect when disabled card is clicked", async () => {
		const handleSelect = vi.fn();
		const user = userEvent.setup();
		const [option] = GRANT_TYPE_OPTIONS;

		render(<GrantTypeCard disabled onSelect={handleSelect} option={option!} />);

		const card = screen.getByTestId("grant-type-card-basic-science");
		expect(card).toBeDisabled();

		await user.click(card);

		expect(handleSelect).not.toHaveBeenCalled();
	});

	it("maintains disabled state when clicked", async () => {
		const handleSelect = vi.fn();
		const user = userEvent.setup();
		const [option] = GRANT_TYPE_OPTIONS;

		render(<GrantTypeCard disabled onSelect={handleSelect} option={option!} />);

		const card = screen.getByTestId("grant-type-card-basic-science");

		expect(card).toBeDisabled();
		expect(card).toHaveAttribute("aria-pressed", "false");

		await user.click(card);

		expect(card).toHaveAttribute("aria-pressed", "false");
	});

	it("renders button with correct type attribute", () => {
		const handleSelect = vi.fn();
		const [option] = GRANT_TYPE_OPTIONS;

		render(<GrantTypeCard onSelect={handleSelect} option={option!} />);

		const card = screen.getByTestId("grant-type-card-basic-science");
		expect(card).toHaveAttribute("type", "button");
	});

	it("generates correct testid from option label", () => {
		const handleSelect = vi.fn();
		const [firstOption, secondOption] = GRANT_TYPE_OPTIONS;

		render(<GrantTypeCard onSelect={handleSelect} option={firstOption!} />);
		expect(screen.getByTestId("grant-type-card-basic-science")).toBeInTheDocument();

		cleanup();

		render(<GrantTypeCard onSelect={handleSelect} option={secondOption!} />);
		expect(screen.getByTestId("grant-type-card-translational-research")).toBeInTheDocument();
	});

	it("handles rapid clicks correctly", async () => {
		const handleSelect = vi.fn();
		const user = userEvent.setup();
		const [option] = GRANT_TYPE_OPTIONS;

		render(<GrantTypeCard onSelect={handleSelect} option={option!} />);

		const card = screen.getByTestId("grant-type-card-basic-science");

		await user.click(card);
		await user.click(card);
		await user.click(card);

		expect(handleSelect).toHaveBeenCalledTimes(3);
		expect(card).toHaveAttribute("aria-pressed", "true");
	});

	it("each grant type has required properties", () => {
		for (const option of GRANT_TYPE_OPTIONS) {
			expect(option).toHaveProperty("label");
			expect(option).toHaveProperty("value");
			expect(option).toHaveProperty("description");
			expect(option).toHaveProperty("imageSrc");

			expect(typeof option.label).toBe("string");
			expect(typeof option.value).toBe("string");
			expect(typeof option.description).toBe("string");
			expect(typeof option.imageSrc).toBe("string");

			expect(option.label).not.toBe("");
			expect(option.value).not.toBe("");
			expect(option.description).not.toBe("");
			expect(option.imageSrc).not.toBe("");
		}
	});

	it("keyboard interaction works correctly", async () => {
		const handleSelect = vi.fn();
		const user = userEvent.setup();
		const [option] = GRANT_TYPE_OPTIONS;

		render(<GrantTypeCard onSelect={handleSelect} option={option!} />);

		const card = screen.getByTestId("grant-type-card-basic-science");

		await user.tab();
		expect(card).toHaveFocus();

		await user.keyboard("{Enter}");
		expect(handleSelect).toHaveBeenCalledTimes(1);

		await user.keyboard(" ");
		expect(handleSelect).toHaveBeenCalledTimes(2);
	});

	it("disabled card cannot receive keyboard interaction", async () => {
		const handleSelect = vi.fn();
		const user = userEvent.setup();
		const [option] = GRANT_TYPE_OPTIONS;

		render(<GrantTypeCard disabled onSelect={handleSelect} option={option!} />);

		const card = screen.getByTestId("grant-type-card-basic-science");

		await user.tab();
		expect(card).not.toHaveFocus();

		await user.keyboard("{Enter}");
		await user.keyboard(" ");
		expect(handleSelect).not.toHaveBeenCalled();
	});
});
