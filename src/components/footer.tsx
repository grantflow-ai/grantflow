import type { Localisation } from "@/i18n";

export function Footer({ locales }: { locales: Localisation }) {
	return (
		<footer className="bg-primary text-primary-foreground py-8" data-testid="footer">
			<div className="container mx-auto px-4 text-center">
				<p data-testid="footer-copyright-text">{locales.footer.copyRightText}</p>
			</div>
		</footer>
	);
}
