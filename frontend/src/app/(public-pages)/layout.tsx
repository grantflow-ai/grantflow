import Footer from "@/components/footer";
import PublicPageHeader from "@/components/nav-header";
import SharedLayout from "@/components/shared-layout";

export default function LandingPagesLayout({ children }: { children: React.ReactNode }) {
	return (
		<SharedLayout>
			<div className="flex min-h-screen w-full flex-col">
				<PublicPageHeader />
				<main className="flex w-full flex-1" data-testid="main-container">
					{children}
				</main>
				<Footer />
			</div>
		</SharedLayout>
	);
}
