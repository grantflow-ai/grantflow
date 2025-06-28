import Image from "next/image";
import Link from "next/link";

import { FooterLinks } from "@/components/layout/navigation/footer-links";
import { PagePath } from "@/enums";

const LinkedInLink = () => {
	return (
		<a
			aria-label="LinkedIn Icon"
			href="https://www.linkedin.com/company/grantflowai/"
			rel="noopener noreferrer"
			target="_blank"
		>
			<Image alt="LinkedIn" className="size-9.5" height={33} src={"/assets/linkedin-icon.png"} width={33} />
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
			<div className="flex flex-col px-4 py-2 md:hidden">
				<nav aria-label="footer-navigation" className="footer-navigation mx-auto w-fit">
					<FooterLinks links={links} />
				</nav>
				<div className="mt-6 flex w-full items-center justify-between">
					<Link aria-label="Go to homepage" href={PagePath.ROOT}>
						<Image alt="logo" height={40} src="/assets/logo-horizontal-text.svg" width={162} />
					</Link>
					<LinkedInLink />
				</div>
			</div>
			<div className="px-7.5 hidden items-center justify-between py-6 md:flex">
				<Link aria-label="Go to homepage" href={PagePath.ROOT}>
					<Image alt="logo" height={57} src="/assets/logo-horizontal.svg" width={56} />
				</Link>
				<nav aria-label="footer-navigation">
					<FooterLinks links={links} />
				</nav>
				<LinkedInLink />
			</div>
		</footer>
	);
}