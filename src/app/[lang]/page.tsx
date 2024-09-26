"use client";
import { SubscribeToMailingListForm } from "@/components/mailing-list/mailing-list-subscribe-form";
import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
import { FileText, Lock, Users } from "lucide-react";

export default function LandingPage() {
	return (
		<div className="flex-grow bg-background text-foreground">
			<section className="bg-gradient-to-b from-primary to-background py-20 text-center relative overflow-hidden">
				<div className="flex flex-col px-4 relative z-10 gap-8">
					<div>
						<h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in-up font-filicudi-solid">
							Collaborative Scientific Grant Writing
						</h1>
						<p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
							Empower your lab with an AI-driven platform that automates grant writing and fosters collaboration—so you
							can focus on what matters most: research.
						</p>
					</div>
					<div className="mb-4">
						<SubscribeToMailingListForm />
					</div>
				</div>
			</section>

			<section id="features" className="py-16 bg-muted">
				<div className="container mx-auto px-4">
					<h2 className="text-3xl font-bold mb-8 text-center font-filicudi-solid">
						Simplify Grant Applications with a Collaborative Workspace
					</h2>
					<p className="text-xl text-center mb-12 max-w-3xl mx-auto">
						GrantFlow.ai transforms the complex grant application process into a streamlined, collaborative experience.
						Manage all aspects of grant writing with your team in one shared workspace.
					</p>
					<div className="grid md:grid-cols-2 gap-8">
						<Card className="transition-transform hover:scale-105">
							<CardHeader>
								<CardTitle className="font-filicudi-solid">The Challenge for Principal Investigators</CardTitle>
							</CardHeader>
							<CardContent>
								<h3 className="text-xl font-semibold mb-4">More Time on Grant Writing, Less on Research?</h3>
								<p>
									As a PI, you need to balance running a lab, publishing research, and securing funding. The complex and
									time-consuming grant writing process can drain your focus from leading groundbreaking research.
									Collaborating with students, administrators, and expert grant writers adds another layer of
									complexity.
								</p>
							</CardContent>
						</Card>
						<Card className="transition-transform hover:scale-105">
							<CardHeader>
								<CardTitle className="font-filicudi-solid">Our Solution</CardTitle>
							</CardHeader>
							<CardContent>
								<h3 className="text-xl font-semibold mb-4">A Collaborative Platform Built for Researchers</h3>
								<p>
									GrantFlow.ai provides a comprehensive platform designed to streamline the grant application process:
								</p>
								<ul className="mt-4 space-y-2">
									<li className="flex items-start">
										<Users className="mr-2 h-5 w-5 text-primary" />
										<span>Collaborative Workspace: Our "Grant Studio" allows seamless collaboration.</span>
									</li>
									<li className="flex items-start">
										<FileText className="mr-2 h-5 w-5 text-primary" />
										<span>AI-Driven Support: Leverage advanced AI to generate and refine proposals.</span>
									</li>
									<li className="flex items-start">
										<Lock className="mr-2 h-5 w-5 text-primary" />
										<span>Security & Compliance: Ensures data privacy and adheres to industry standards.</span>
									</li>
								</ul>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			<section className="py-16">
				<div className="container mx-auto px-4">
					<h2 className="text-3xl font-bold mb-8 text-center font-filicudi-solid">Why GrantFlow.ai?</h2>
					<h3 className="text-xl text-center mb-12">Tailored for the Complex Needs of Principal Investigators</h3>
					<div className="grid md:grid-cols-3 gap-8">
						<Card className="transition-transform hover:scale-105">
							<CardHeader>
								<CardTitle className="font-filicudi-solid">Collaborative Tools</CardTitle>
							</CardHeader>
							<CardContent>
								Your entire team can participate in the application process, ensuring everyone from administrators to
								researchers can contribute efficiently.
							</CardContent>
						</Card>
						<Card className="transition-transform hover:scale-105">
							<CardHeader>
								<CardTitle className="font-filicudi-solid">Customizable Proposals</CardTitle>
							</CardHeader>
							<CardContent>
								Create proposals that meet the specific guidelines of major funding bodies like NIH, NSF, and NASA, with
								AI assistance for technical and cutting-edge research language.
							</CardContent>
						</Card>
						<Card className="transition-transform hover:scale-105">
							<CardHeader>
								<CardTitle className="font-filicudi-solid">Grant Discovery & Tracking</CardTitle>
							</CardHeader>
							<CardContent>
								Discover relevant grants, track progress, and ensure compliance, all within a single platform.
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			<section className="py-16">
				<div className="container mx-auto px-4 text-center">
					<h2 className="text-3xl font-bold mb-8 font-filicudi-solid">
						Ready to Transform Your Grant Writing Process?
					</h2>
					<p className="text-lg mb-8 max-w-3xl mx-auto">
						Join the growing community of researchers who are using GrantFlow.AI to streamline their grant applications,
						increase their success rates, and focus more on their groundbreaking research.
					</p>
					<SubscribeToMailingListForm />
				</div>
			</section>
		</div>
	);
}
