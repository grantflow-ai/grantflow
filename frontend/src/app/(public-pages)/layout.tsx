import { Footer } from "@/components/footer";
import { NavHeader } from "@/components/nav-header";
import { SharedLayout } from "@/components/shared-layout";

export default function LandingPagesLayout({ children }: { children: React.ReactNode }) {
	return (
		<SharedLayout>
			<NavHeader />
			<main className="flex grow" data-testid="main-container">
				{children}
			</main>
			<Footer />
		</SharedLayout>
	);
}
