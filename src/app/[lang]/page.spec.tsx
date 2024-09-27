import en from "@/localisations/en.json";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LandingPage from "./page";

vi.mock("@/utils/env", () => ({
	getEnv: () => ({ NEXT_PUBLIC_SITE_URL: "https://example.com" }),
}));

describe("LandingPage", () => {
	it("renders the heading section correctly", async () => {
		render(await LandingPage({ params: { lang: "en" } }));

		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en.landingPage.headingSection.title);
		expect(screen.getByText(en.landingPage.headingSection.subtitle)).toBeInTheDocument();
	});

	it("renders the problem and solution section correctly", async () => {
		render(await LandingPage({ params: { lang: "en" } }));

		expect(screen.getByText(en.landingPage.problemAndSolutionSection.title)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.subtitle)).toBeInTheDocument();

		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card1.title)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card1.subtitle)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card1.content)).toBeInTheDocument();

		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card2.title)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card2.subtitle)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card2.content)).toBeInTheDocument();

		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card2.list.item1)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card2.list.item2)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card2.list.item3)).toBeInTheDocument();
	});

	it("renders the features section correctly", async () => {
		render(await LandingPage({ params: { lang: "en" } }));

		expect(screen.getByText(en.landingPage.featuresSection.title)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.featuresSection.subtitle)).toBeInTheDocument();

		expect(screen.getByText(en.landingPage.featuresSection.card1.title)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.featuresSection.card1.content)).toBeInTheDocument();

		expect(screen.getByText(en.landingPage.featuresSection.card2.title)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.featuresSection.card2.content)).toBeInTheDocument();

		expect(screen.getByText(en.landingPage.featuresSection.card3.title)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.featuresSection.card3.content)).toBeInTheDocument();
	});

	it("renders the call to action section correctly", async () => {
		render(await LandingPage({ params: { lang: "en" } }));

		expect(screen.getByText(en.landingPage.callToAction.title)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.callToAction.content)).toBeInTheDocument();
	});
});
