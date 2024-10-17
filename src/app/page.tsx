"use server";

import { SubscribeToMailingListForm } from "@/components/mailing-list/mailing-list-subscribe-form";
import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
import { FileText, Lock, Users } from "lucide-react";
import { Footer } from "@/components/footer";

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
	callToAction: {
		title: "Ready to Transform Your Grant Writing Process?",
	},
};

// eslint-disable-next-line @typescript-eslint/require-await
export default async function LandingPage() {
	return (
		<div className="flex-grow text-foreground" data-testid="landing-page">
			<section className="py-20 text-center relative overflow-hidden" data-testid="heading-section">
				<div className="flex flex-col px-4 relative z-10 gap-8">
					<div>
						<h1
							className="text-4xl md:text-8xl font-bold mb-6 animate-fade-in-up font-filicudi-solid text-primary"
							data-testid="heading-title"
						>
							{locales.headingSection.title}
						</h1>
						<h2 className="text-2xl font-filicudi-solid text-foreground" data-testid="heading-subtitle">
							{locales.headingSection.subtitle}
						</h2>
					</div>
					<div className="mb-4">
						<SubscribeToMailingListForm data-testid="mailing-list-form" />
					</div>
				</div>
			</section>

			<section id="features" className="py-16" data-testid="problem-solution-section">
				<div className="container mx-auto px-4">
					<h2
						className="text-3xl font-bold mb-8 text-center font-filicudi-solid text-primary"
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
						<Card
							className="transition-transform hover:scale-105 text-card-foreground"
							data-testid="card-1"
						>
							<CardHeader>
								<CardTitle className="font-filicudi-solid text-primary">
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
						<Card
							className="transition-transform hover:scale-105 text-card-foreground"
							data-testid="card-2"
						>
							<CardHeader>
								<CardTitle className="font-filicudi-solid text-primary">
									{locales.problemAndSolutionSection.card2.title}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<h3 className="text-xl font-semibold mb-4 text-accent-foreground">
									{locales.problemAndSolutionSection.card2.subtitle}
								</h3>
								<p>{locales.problemAndSolutionSection.card2.content}</p>
								<ul className="mt-4 space-y-2">
									<li className="flex items-start" data-testid="card2-item1">
										<Users className="mr-2 h-5 w-5 text-primary" />
										<span>{locales.problemAndSolutionSection.card2.list.item1}</span>
									</li>
									<li className="flex items-start" data-testid="card2-item2">
										<FileText className="mr-2 h-5 w-5 text-primary" />
										<span>{locales.problemAndSolutionSection.card2.list.item2}</span>
									</li>
									<li className="flex items-start" data-testid="card2-item3">
										<Lock className="mr-2 h-5 w-5 text-primary" />
										<span>{locales.problemAndSolutionSection.card2.list.item3}</span>
									</li>
								</ul>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			<section className="py-16 bg-background" data-testid="features-section">
				<div className="container mx-auto px-4">
					<h2
						className="text-3xl font-bold mb-8 text-center font-filicudi-solid text-primary"
						data-testid="features-title"
					>
						{locales.featuresSection.title}
					</h2>
					<h3 className="text-xl text-center mb-12 text-muted-foreground" data-testid="features-subtitle">
						{locales.featuresSection.subtitle}
					</h3>
					<div className="grid md:grid-cols-3 gap-8">
						<Card
							className="transition-transform hover:scale-105 text-card-foreground"
							data-testid="feature-card-1"
						>
							<CardHeader>
								<CardTitle className="font-filicudi-solid text-primary">
									{locales.featuresSection.card1.title}
								</CardTitle>
							</CardHeader>
							<CardContent>{locales.featuresSection.card1.content}</CardContent>
						</Card>
						<Card
							className="transition-transform hover:scale-105 text-card-foreground"
							data-testid="feature-card-2"
						>
							<CardHeader>
								<CardTitle className="font-filicudi-solid text-primary">
									{locales.featuresSection.card2.title}
								</CardTitle>
							</CardHeader>
							<CardContent>{locales.featuresSection.card2.content}</CardContent>
						</Card>
						<Card
							className="transition-transform hover:scale-105 text-card-foreground"
							data-testid="feature-card-3"
						>
							<CardHeader>
								<CardTitle className="font-filicudi-solid text-primary">
									{locales.featuresSection.card3.title}
								</CardTitle>
							</CardHeader>
							<CardContent>{locales.featuresSection.card3.content}</CardContent>
						</Card>
					</div>
				</div>
			</section>

			<section className="py-16" data-testid="cta-section">
				<div className="container mx-auto px-4 text-center">
					<h2 className="text-3xl font-bold mb-8 font-filicudi-solid text-primary" data-testid="cta-title">
						{locales.callToAction.title}
					</h2>
					<SubscribeToMailingListForm data-testid="cta-mailing-list-form" />
				</div>
			</section>

			<Footer />
		</div>
	);
}
