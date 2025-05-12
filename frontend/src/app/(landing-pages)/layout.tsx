import { NavHeader } from "@/components/nav-header";
import { Footer } from "@/components/footer";
import { SharedLayout } from "@/components/shared-layout";

export default function LandingPagesLayout({ children }: { children: React.ReactNode }) {
	return (
		<SharedLayout>
			<NavHeader />
			<main
				className="md:min-h-[calc(100dvh-5rem)] m-auto min-h-[calc(100dvh-4rem)]"
				data-testid="main-container"
			>
				{children}
			</main>
			<Footer />
		</SharedLayout>
	);
}
