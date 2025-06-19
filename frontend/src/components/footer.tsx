import Image from "next/image";
import Link from "next/link";

import { FooterLinks } from "@/components/footer-links";
import { LogoDark } from "@/components/logo";
import { PagePath } from "@/enums";

const LinkedInLink = () => {
	return (
		<a
			aria-label="LinkedIn Icon"
			href="https://www.linkedin.com/company/grantflowai/"
			rel="noopener noreferrer"
			target="_blank"
		>
			<Image alt="LinkedIn" className="size-9.5" height={38} src={"/assets/linkedin-icon.png"} width={38} />
		</a>
	);
};

const links = [
	{
		href: PagePath.TERMS,
		label: "Terms of Use",
	},
	{
		href: PagePath.PRIVACY,
		label: "Privacy Policy",
	},
	{
		href: PagePath.IMPRINT,
		label: "Imprint",
	},
];

export default function Footer() {
	return (
		<footer
			className="relative z-0 w-full border-t border-t-gray-400/40 bg-white py-0 md:py-0.5"
			data-testid="site-footer"
			id="site-footer"
		>
			<div className="flex flex-col px-6 py-2 md:hidden">
				<nav aria-label="footer-navigation">
					<FooterLinks isMobile links={links} />
				</nav>
				<div className="flex w-full items-center justify-between">
					<Link aria-label="Go to homepage" href={PagePath.ROOT}>
						<LogoDark className="h-15.5" height="250" width="250" />
					</Link>
					<LinkedInLink />
				</div>
			</div>
			<div className="mx-2 my-6 hidden items-center justify-between px-8 md:flex md:flex-row">
				<Link aria-label="Go to homepage" href={PagePath.ROOT}>
					<LogoDark className="h-15.5" height="250" width="250" />
				</Link>
				<nav aria-label="footer-navigation">
					<FooterLinks links={links} />
				</nav>
				<LinkedInLink />
			</div>
		</footer>
	);
}
