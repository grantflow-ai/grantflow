import { fireEvent, render, screen } from "@testing-library/react";
import { useTheme } from "next-themes";
import { ThemeToggle } from "./theme-toggle";

// Mock the next-themes module
vi.mock("next-themes", () => ({
	useTheme: vi.fn(),
}));

describe("ThemeToggle", () => {
	const mockSetTheme = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the button with sun icon in light mode", () => {
		vi.mocked(useTheme).mockReturnValue({ theme: "light", setTheme: mockSetTheme } as any);

		render(<ThemeToggle />);

		const button = screen.getByTestId("theme-toggle-button");
		const sunIcon = screen.getByTestId("theme-toggle-sun-icon");
		const srText = screen.getByTestId("theme-toggle-sr-text");

		expect(button).toBeInTheDocument();
		expect(sunIcon).toBeVisible();
		expect(srText).toHaveTextContent("Toggle theme");
	});

	it("renders the button with moon icon in dark mode", () => {
		vi.mocked(useTheme).mockReturnValue({ theme: "dark", setTheme: mockSetTheme } as any);

		render(<ThemeToggle />);

		const button = screen.getByTestId("theme-toggle-button");
		const moonIcon = screen.getByTestId("theme-toggle-moon-icon");

		expect(button).toBeInTheDocument();
		expect(moonIcon).toBeVisible();
	});

	it("toggles theme from light to dark when clicked", () => {
		vi.mocked(useTheme).mockReturnValue({ theme: "light", setTheme: mockSetTheme } as any);

		render(<ThemeToggle />);

		const button = screen.getByTestId("theme-toggle-button");
		fireEvent.click(button);

		expect(mockSetTheme).toHaveBeenCalledWith("dark");
	});

	it("toggles theme from dark to light when clicked", () => {
		vi.mocked(useTheme).mockReturnValue({ theme: "dark", setTheme: mockSetTheme } as any);

		render(<ThemeToggle />);

		const button = screen.getByTestId("theme-toggle-button");
		fireEvent.click(button);

		expect(mockSetTheme).toHaveBeenCalledWith("light");
	});
});
