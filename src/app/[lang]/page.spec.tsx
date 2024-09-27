import en from "@/localisations/en.json";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LandingPage from "./page";

describe("LandingPage", () => {
	it("renders the heading section correctly", () => {
		render(<LandingPage params={{ lang: "en" }} />);

		// Check for title and subtitle
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en.landingPage.headingSection.title);
		expect(screen.getByText(en.landingPage.headingSection.subtitle)).toBeInTheDocument();
	});

	it("renders the problem and solution section correctly", () => {
		render(<LandingPage params={{ lang: "en" }} />);

		// Check for Problem and Solution section titles and subtitles
		expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(en.landingPage.problemAndSolutionSection.title);
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.subtitle)).toBeInTheDocument();

		// Card 1 - The Challenge for Principal Investigators
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card1.title)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card1.subtitle)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card1.content)).toBeInTheDocument();

		// Card 2 - Our Solution
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card2.title)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card2.subtitle)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card2.content)).toBeInTheDocument();

		// Card 2 list items
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card2.list.item1)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card2.list.item2)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.problemAndSolutionSection.card2.list.item3)).toBeInTheDocument();
	});

	it("renders the features section correctly", () => {
		render(<LandingPage params={{ lang: "en" }} />);

		// Features Section Title and Subtitle
		expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(en.landingPage.featuresSection.title);
		expect(screen.getByText(en.landingPage.featuresSection.subtitle)).toBeInTheDocument();

		// Card 1 - Collaborative Tools
		expect(screen.getByText(en.landingPage.featuresSection.card1.title)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.featuresSection.card1.content)).toBeInTheDocument();

		// Card 2 - Customizable Proposals
		expect(screen.getByText(en.landingPage.featuresSection.card2.title)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.featuresSection.card2.content)).toBeInTheDocument();

		// Card 3 - Grant Discovery & Tracking
		expect(screen.getByText(en.landingPage.featuresSection.card3.title)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.featuresSection.card3.content)).toBeInTheDocument();
	});

	it("renders the call to action section correctly", () => {
		render(<LandingPage params={{ lang: "en" }} />);

		// Call to Action Title and Content
		expect(screen.getByText(en.landingPage.callToAction.title)).toBeInTheDocument();
		expect(screen.getByText(en.landingPage.callToAction.content)).toBeInTheDocument();
	});
});
