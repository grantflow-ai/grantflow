import en from "::localisations/en.json";
import { getServerClient } from "@/utils/supabase/server";
import { render, screen, waitFor } from "@testing-library/react";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "./page";

vi.mock("@/utils/supabase/server", () => ({
	getServerClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
}));

vi.mock("next/image", () => ({
	default: ({ alt, ...props }: any) => <img alt={alt ?? "mock image"} {...props} />,
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

		await LandingPage({ params: { lang: "en" } });

		expect(vi.mocked(redirect)).toHaveBeenCalledWith("/test-user-id");
	});

	it("renders landing page content with correct structure", async () => {
		const mockSupabase = {
			auth: {
				getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
			},
		};
		vi.mocked(getServerClient).mockReturnValue(mockSupabase as any);

		render(await LandingPage({ params: { lang: "en" } }));

		expect(screen.getByTestId("landing-title")).toBeInTheDocument();
		expect(screen.getByTestId("landing-description")).toBeInTheDocument();
		expect(screen.getByTestId("landing-cta")).toBeInTheDocument();
		expect(screen.getByTestId("landing-screenshot")).toBeInTheDocument();
	});

	it("uses the correct language parameter for the auth link", async () => {
		const mockSupabase = {
			auth: {
				getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
			},
		};
		vi.mocked(getServerClient).mockReturnValue(mockSupabase as any);

		render(await LandingPage({ params: { lang: "en" } }));

		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "en/auth");
	});

	it("applies translations from getLocale", async () => {
		const mockSupabase = {
			auth: {
				getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
			},
		};
		vi.mocked(getServerClient).mockReturnValue(mockSupabase as any);
		render(await LandingPage({ params: { lang: "en" } }));

		await waitFor(() => {
			expect(screen.getByTestId("landing-title")).toHaveTextContent(en.landingTitle);
		});

		expect(screen.getByTestId("landing-description")).toHaveTextContent(en.landingDescription);
		expect(screen.getByTestId("landing-cta")).toHaveTextContent(en.landingCta);
	});
});
