import { getServerClient } from "@/utils/supabase/server";
import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import LandingPage from "./page";

// Mock the necessary imports and functions
vi.mock("@/utils/supabase/server", () => ({
	getServerClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
}));

vi.mock("next/image", () => ({
	// biome-ignore lint/a11y/useAltText: <explanation>
	default: ({ alt, ...props }: any) => <img alt={alt || "mock image"} {...props} />,
}));

describe("LandingPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("redirects when user is authenticated", async () => {
		const mockSupabase = {
			auth: {
				getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user-id" } } }),
			},
		};
		vi.mocked(getServerClient).mockReturnValue(mockSupabase as any);

		await LandingPage();

		expect(vi.mocked(redirect)).toHaveBeenCalledWith("/test-user-id");
	});

	it("renders landing page content when user is not authenticated", async () => {
		const mockSupabase = {
			auth: {
				getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
			},
		};
		vi.mocked(getServerClient).mockReturnValue(mockSupabase as any);

		const { container } = render(await LandingPage());

		expect(screen.getByText("Get to month three on day one")).toBeInTheDocument();
		expect(
			screen.getByText("Trumpet is a world class SaaS project Starter, clean code with 95% test coverage."),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Get Started" })).toBeInTheDocument();
		expect(container.querySelector('img[alt="screenshot"]')).toBeInTheDocument();
	});
});
