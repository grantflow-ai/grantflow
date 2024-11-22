/* eslint-disable @typescript-eslint/require-await */
"use server";

import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
import { FileText, Lock, Users } from "lucide-react";
import { Footer } from "@/components/footer";
import { NavHeader } from "@/components/landing-page/nav-header";

const locales = {
	headingSection: {
		title: "GrantFlow.ai",
		subtitle: "Supercharge your grant writing",
	},
	problemAndSolutionSection: {
		title: "Simplify Grant Applications with a Collaborative Workspace",
		subtitle:
			"GrantFlow.ai transforms the complex grant application process into a streamlined, collaborative experience. Manage all aspects of grant writing with your team in one shared workspace.",
		card1: {
			content:
				"As a PI, you need to balance running a lab, publishing research, and securing funding for future studies. The complex and time-consuming grant writing process can drain your focus from leading groundbreaking research. Collaborating with students, administrators, and other researchers adds another layer of complexity.",
			subtitle: "More Time on Grant Writing, Less on Research?",
			title: "The Challenge for Principal Investigators",
		},
		card2: {
			title: "Our Solution",
			subtitle: "A Collaborative Platform Built for Researchers",
			content:
				"GrantFlow.ai provides a comprehensive platform designed to streamline the grant application writing process:",
			list: {
				item1: 'Collaborative Workspace: Our "Grant Studio" allows seamless collaboration.',
				item2: "AI-Driven Support: Leverage advanced AI to accelerate writing and refine proposals.",
				item3: "Security & Compliance: Ensures data privacy and adheres to industry standards.",
			},
		},
	},
	featuresSection: {
		title: "Why GrantFlow.ai?",
		subtitle: "Tailored for the Complex Needs of Principal Investigators",
		card1: {
			title: "Collaborative Tools",
			content:
				"Your entire team can participate in the application process, ensuring everyone from administrators to researchers can contribute efficiently.",
		},
		card2: {
			title: "Customizable Proposals",
			content:
				"Create proposals that meet the specific guidelines of major funding bodies like NIH, NSF, and ERC, with AI assistance fine-tuned for technical and cutting-edge research language.",
		},
		card3: {
			title: "Grant Discovery & Tracking",
			content: "Discover relevant grants, track progress, and ensure compliance, all within a single platform.",
		},
	},
};

export default async function LandingPage() {
	return (
		<div className="flex flex-col">
			<NavHeader />
			<div className="flex-grow container">
				<section className="bg-background pt-10 md:pt-16" data-testid="heading-section">
					<div className="container mx-auto px-4 text-center">
						<h1
							className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in-up text-primary"
							data-testid="heading-title"
						>
							{locales.headingSection.title}
						</h1>
						<p className="text-xl md:text-2xl mb-8 text-foreground" data-testid="heading-subtitle">
							{locales.headingSection.subtitle}
						</p>
					</div>
				</section>

				<section id="features" className="py-16 md:py-24 bg-background" data-testid="problem-solution-section">
					<div className="container mx-auto px-4">
						<h2
							className="text-3xl md:text-4xl font-bold mb-8 text-center text-primary"
							data-testid="problem-solution-title"
						>
							{locales.problemAndSolutionSection.title}
						</h2>
						<p
							className="text-xl text-center mb-12 max-w-3xl mx-auto text-muted-foreground"
							data-testid="problem-solution-subtitle"
						>
							{locales.problemAndSolutionSection.subtitle}
						</p>
						<div className="grid md:grid-cols-2 gap-8">
							<Card className="transition-all duration-300 hover:shadow-lg" data-testid="card-1">
								<CardHeader>
									<CardTitle className="text-primary">
										{locales.problemAndSolutionSection.card1.title}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<h3 className="text-xl font-semibold mb-4 text-accent-foreground">
										{locales.problemAndSolutionSection.card1.subtitle}
									</h3>
									<p>{locales.problemAndSolutionSection.card1.content}</p>
								</CardContent>
							</Card>
							<Card className="transition-all duration-300 hover:shadow-lg" data-testid="card-2">
								<CardHeader>
									<CardTitle className="text-primary">
										{locales.problemAndSolutionSection.card2.title}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<h3 className="text-xl font-semibold mb-4 text-accent-foreground">
										{locales.problemAndSolutionSection.card2.subtitle}
									</h3>
									<p>{locales.problemAndSolutionSection.card2.content}</p>
									<ul className="mt-4 space-y-4">
										<li className="flex items-start" data-testid="card2-item1">
											<Users className="mr-3 h-6 w-6 text-primary" />
											<span>{locales.problemAndSolutionSection.card2.list.item1}</span>
										</li>
										<li className="flex items-start" data-testid="card2-item2">
											<FileText className="mr-3 h-6 w-6 text-primary" />
											<span>{locales.problemAndSolutionSection.card2.list.item2}</span>
										</li>
										<li className="flex items-start" data-testid="card2-item3">
											<Lock className="mr-3 h-6 w-6 text-primary" />
											<span>{locales.problemAndSolutionSection.card2.list.item3}</span>
										</li>
									</ul>
								</CardContent>
							</Card>
						</div>
					</div>
				</section>

				<section className="py-16 md:py-24 bg-muted" data-testid="features-section">
					<div className="container mx-auto px-4">
						<h2
							className="text-3xl md:text-4xl font-bold mb-8 text-center text-primary"
							data-testid="features-title"
						>
							{locales.featuresSection.title}
						</h2>
						<h3 className="text-xl text-center mb-12 text-muted-foreground" data-testid="features-subtitle">
							{locales.featuresSection.subtitle}
						</h3>
						<div className="grid md:grid-cols-3 gap-8">
							{[
								locales.featuresSection.card1,
								locales.featuresSection.card2,
								locales.featuresSection.card3,
							].map((card, index) => (
								<Card
									key={index}
									className="transition-all duration-300 hover:shadow-lg"
									data-testid={`feature-card-${index + 1}`}
								>
									<CardHeader>
										<CardTitle className="text-primary">{card.title}</CardTitle>
									</CardHeader>
									<CardContent>{card.content}</CardContent>
								</Card>
							))}
						</div>
					</div>
				</section>
			</div>

			<Footer />
		</div>
	);
}
