import { LogoDark } from "@/components/logo";
import Image from "next/image";
import linkedInIcon from "@/assets/linkedin-icon.png";
import Link from "next/link";

const LinkedInLink = () => {
	return (
		<a
			aria-label="LinkedIn Icon"
			href="https://www.linkedin.com/company/grantflowai/"
			rel="noopener noreferrer"
			target="_blank"
		>
			<Image alt="LinkedIn" className="size-9.5" height={38} src={linkedInIcon} width={38} />
		</a>
	);
};

const FooterLinks = ({ isMobile = false }) => {
	return (
		<ul className={`text-primary font-button flex gap-5 ${isMobile ? "flex-col items-end my-1" : ""}`}>
			<li>
				<Link
					className={`text-primary ${isMobile ? "text-lg" : ""} hover:text-slate-500 hover:no-underline focus:outline-none focus:ring-2 focus:ring-primary`}
					href="/terms"
				>
					Terms of Use
				</Link>
			</li>
			<li>
				<Link
					className={`text-primary ${isMobile ? "text-lg" : ""} hover:text-slate-500 hover:no-underline focus:outline-none focus:ring-2 focus:ring-primary`}
					href="/privacy"
				>
					Privacy Policy
				</Link>
			</li>
			<li>
				<Link
					className={`text-primary ${isMobile ? "text-lg" : ""} hover:text-slate-500 hover:no-underline focus:outline-none focus:ring-2 focus:ring-primary`}
					href="/imprint"
				>
					Imprint
				</Link>
			</li>
		</ul>
	);
};

export function Footer() {
	return (
		<footer
			aria-label="site-footer"
			className="relative z-0 bg-white py-0 md:py-0.5 border-t border-t-gray-400/40"
			data-testid="site-footer"
			id="site-footer"
		>
			<div className="md:hidden flex flex-col px-6 py-2">
				<nav aria-label="footer-navigation">
					<FooterLinks isMobile />
				</nav>
				<div className="flex w-full items-center justify-between">
					<Link aria-label="Go to homepage" href="/">
						<LogoDark className="h-15.5" height="250" width="250" />
					</Link>
					<LinkedInLink />
				</div>
			</div>
			<div className="hidden md:flex md:flex-row items-center justify-between mx-2 my-6 px-8">
				<Link aria-label="Go to homepage" href="/">
					<LogoDark className="h-15.5" height="250" width="250" />
				</Link>
				<nav aria-label="footer-navigation">
					<FooterLinks />
				</nav>
				<LinkedInLink />
			</div>
		</footer>
	);
}
