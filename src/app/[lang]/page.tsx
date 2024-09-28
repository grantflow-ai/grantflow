"use client";

import { SubscribeToMailingListForm } from "@/components/mailing-list/mailing-list-subscribe-form";
import { type SupportedLocale, getLocale } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
import { FileText, Lock, Users } from "lucide-react";

export default async function LandingPage({ params: { lang } }: { params: { lang: SupportedLocale } }) {
	const locales = await getLocale(lang);

	return (
		<div className="flex-grow bg-background text-foreground" data-testid="landing-page">
			<section className="bg-base py-20 text-center relative overflow-hidden" data-testid="heading-section">
				<div className="flex flex-col px-4 relative z-10 gap-8">
					<div>
						<h1
							className="text-4xl md:text-8xl font-bold mb-6 animate-fade-in-up font-filicudi-solid"
							data-testid="heading-title"
						>
							{locales.landingPage.headingSection.title}
						</h1>
						<h2 className="text-2xl font-filicudi-solid" data-testid="heading-subtitle">
							{locales.landingPage.headingSection.subtitle}
						</h2>
					</div>
					<div className="mb-4">
						<SubscribeToMailingListForm data-testid="mailing-list-form" locales={locales} />
					</div>
				</div>
			</section>

			<section id="features" className="py-16 bg-muted" data-testid="problem-solution-section">
				<div className="container mx-auto px-4">
					<h2 className="text-3xl font-bold mb-8 text-center font-filicudi-solid" data-testid="problem-solution-title">
						{locales.landingPage.problemAndSolutionSection.title}
					</h2>
					<p className="text-xl text-center mb-12 max-w-3xl mx-auto" data-testid="problem-solution-subtitle">
						{locales.landingPage.problemAndSolutionSection.subtitle}
					</p>
					<div className="grid md:grid-cols-2 gap-8">
						<Card className="transition-transform hover:scale-105" data-testid="card-1">
							<CardHeader>
								<CardTitle className="font-filicudi-solid">
									{locales.landingPage.problemAndSolutionSection.card1.title}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<h3 className="text-xl font-semibold mb-4">
									{locales.landingPage.problemAndSolutionSection.card1.subtitle}
								</h3>
								<p>{locales.landingPage.problemAndSolutionSection.card1.content}</p>
							</CardContent>
						</Card>
						<Card className="transition-transform hover:scale-105" data-testid="card-2">
							<CardHeader>
								<CardTitle className="font-filicudi-solid">
									{locales.landingPage.problemAndSolutionSection.card2.title}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<h3 className="text-xl font-semibold mb-4">
									{locales.landingPage.problemAndSolutionSection.card2.subtitle}
								</h3>
								<p>{locales.landingPage.problemAndSolutionSection.card2.content}</p>
								<ul className="mt-4 space-y-2">
									<li className="flex items-start" data-testid="card2-item1">
										<Users className="mr-2 h-5 w-5 text-primary" />
										<span>{locales.landingPage.problemAndSolutionSection.card2.list.item1}</span>
									</li>
									<li className="flex items-start" data-testid="card2-item2">
										<FileText className="mr-2 h-5 w-5 text-primary" />
										<span>{locales.landingPage.problemAndSolutionSection.card2.list.item2}</span>
									</li>
									<li className="flex items-start" data-testid="card2-item3">
										<Lock className="mr-2 h-5 w-5 text-primary" />
										<span>{locales.landingPage.problemAndSolutionSection.card2.list.item3}</span>
									</li>
								</ul>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			<section className="py-16" data-testid="features-section">
				<div className="container mx-auto px-4">
					<h2 className="text-3xl font-bold mb-8 text-center font-filicudi-solid" data-testid="features-title">
						{locales.landingPage.featuresSection.title}
					</h2>
					<h3 className="text-xl text-center mb-12" data-testid="features-subtitle">
						{locales.landingPage.featuresSection.subtitle}
					</h3>
					<div className="grid md:grid-cols-3 gap-8">
						<Card className="transition-transform hover:scale-105" data-testid="feature-card-1">
							<CardHeader>
								<CardTitle className="font-filicudi-solid">{locales.landingPage.featuresSection.card1.title}</CardTitle>
							</CardHeader>
							<CardContent>{locales.landingPage.featuresSection.card1.content}</CardContent>
						</Card>
						<Card className="transition-transform hover:scale-105" data-testid="feature-card-2">
							<CardHeader>
								<CardTitle className="font-filicudi-solid">{locales.landingPage.featuresSection.card2.title}</CardTitle>
							</CardHeader>
							<CardContent>{locales.landingPage.featuresSection.card2.content}</CardContent>
						</Card>
						<Card className="transition-transform hover:scale-105" data-testid="feature-card-3">
							<CardHeader>
								<CardTitle className="font-filicudi-solid">{locales.landingPage.featuresSection.card3.title}</CardTitle>
							</CardHeader>
							<CardContent>{locales.landingPage.featuresSection.card3.content}</CardContent>
						</Card>
					</div>
				</div>
			</section>

			<section className="py-16" data-testid="cta-section">
				<div className="container mx-auto px-4 text-center">
					<h2 className="text-3xl font-bold mb-8 font-filicudi-solid" data-testid="cta-title">
						{locales.landingPage.callToAction.title}
					</h2>
					<SubscribeToMailingListForm data-testid="cta-mailing-list-form" locales={locales} />
				</div>
			</section>
		</div>
	);
}
