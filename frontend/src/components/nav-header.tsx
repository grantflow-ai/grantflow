"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AppButton } from "@/components/app-button";
import { IconCancel, IconHamburger } from "@/components/landing-page/icons";
import { Logo, LogoDark } from "@/components/logo";
import { ScrollButton } from "@/components/scroll-button";
import { Button } from "@/components/ui/button";
import { PagePath } from "@/enums";

import { IconGoAhead } from "./icons";

const BREAKPOINT_MD = 768;

export function NavHeader() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const pathname = usePathname();
	const isHomePage = pathname === PagePath.ROOT.toString();
	const isTermsPage =
		pathname === PagePath.TERMS.toString() ||
		pathname === PagePath.PRIVACY.toString() ||
		pathname === PagePath.IMPRINT.toString();

	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth >= BREAKPOINT_MD && isMobileMenuOpen) {
				setIsMobileMenuOpen(false);
			}
		};

		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, [isMobileMenuOpen]);

	return (
		<header
			className={`
		relative z-40 transition-colors duration-300
		${isMobileMenuOpen ? "bg-white" : "bg-background"}
		`}
			data-testid="nav-header"
		>
			<div
				className="flex items-center justify-between border-b border-b-gray-400/20 px-4 md:px-5 lg:px-6 xl:px-7"
				data-testid="nav-header-container"
			>
				<Link aria-label="Go to homepage" href={PagePath.ROOT}>
					<Logo
						className={`sm:h-13 lg:h-15 my-1 h-12 w-auto transition-opacity duration-300 md:my-2 md:h-14 lg:my-4 xl:my-6 xl:h-16 ${isMobileMenuOpen ? "opacity-0" : "opacity-100"}`}
						height="auto"
						width="auto"
					/>
				</Link>
				<Link aria-label="Go to homepage" className="absolute" href={PagePath.ROOT}>
					<LogoDark
						className={`sm:h-13 lg:h-15 my-1 h-12 w-auto transition-opacity duration-300 md:my-2 md:h-14 lg:my-4 xl:my-6 xl:h-16 ${isMobileMenuOpen ? "opacity-100" : "opacity-0"}`}
						height="auto"
						width="auto"
					/>
				</Link>
				<div className="hidden items-center md:flex" data-testid="nav-header-links">
					<AppButton
						aria-label="Go to Home Page"
						className={`px-4 py-2 ${pathname === PagePath.ROOT.toString() ? "text-link-hover" : ""}`}
						theme="light"
						variant="link"
					>
						<Link href={PagePath.ROOT}>Home</Link>
					</AppButton>
					<AppButton
						aria-label="Go to About Us Page"
						className={`px-4 py-2 ${pathname === PagePath.ABOUT_US.toString() ? "text-link-hover" : ""}`}
						theme="light"
						variant="link"
					>
						<Link href={PagePath.ABOUT_US}>About us</Link>
					</AppButton>
					{isHomePage && (
						<ScrollButton
							aria-label="Go to Waitlist Form"
							className="ms-6"
							desktopTargetId="waitlist"
							rightIcon={<IconGoAhead />}
							size="lg"
						>
							Try For Free
						</ScrollButton>
					)}
				</div>
				<Button
					aria-label={isMobileMenuOpen ? "Close Navigation Menu" : "Open Navigation Menu"}
					className={`relative bg-transparent transition-colors duration-300 hover:bg-transparent md:hidden ${isMobileMenuOpen ? "text-primary" : "text-white"}`}
					onClick={() => {
						setIsMobileMenuOpen(!isMobileMenuOpen);
					}}
					size="icon"
				>
					<IconHamburger
						className={`absolute transition-all duration-300 ease-in-out
							${isMobileMenuOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}
							`}
						height={30}
						width={30}
					/>
					<IconCancel
						className={`absolute transition-all duration-300 ease-in-out
							${isMobileMenuOpen ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"}
							`}
						height={30}
						width={30}
					/>
				</Button>
			</div>
			<div
				aria-expanded={isMobileMenuOpen}
				aria-hidden={!isMobileMenuOpen}
				className={`absolute inset-x-0 top-full flex flex-col gap-4 bg-white p-4 transition-all duration-300 ease-in-out sm:px-6
				md:hidden
				${isTermsPage && isMobileMenuOpen ? "border-primary border-b" : ""}
				${isMobileMenuOpen ? "max-h-lg pointer-events-auto opacity-100" : "max-h-sm pointer-events-none opacity-0"}
				`}
				data-testid="mobile-menu"
			>
				<AppButton
					aria-label="Go to Home Page"
					className={pathname === PagePath.ROOT.toString() ? "text-link-hover" : ""}
					size="lg"
					variant="link"
				>
					<Link
						href={PagePath.ROOT}
						onClick={() => {
							setIsMobileMenuOpen(false);
						}}
					>
						Home
					</Link>
				</AppButton>
				<AppButton
					aria-label="Go to About Us Page"
					className={pathname === PagePath.ABOUT_US.toString() ? "text-link-hover" : ""}
					size="lg"
					variant="link"
				>
					<Link
						href={PagePath.ABOUT_US}
						onClick={() => {
							setIsMobileMenuOpen(false);
						}}
					>
						About us
					</Link>
				</AppButton>
				{isHomePage && (
					<ScrollButton
						aria-label="Go to Waitlist Form"
						mobileTargetId="waitlist-form-container"
						offset={80}
						onClick={() => {
							setIsMobileMenuOpen(false);
						}}
						rightIcon={<IconGoAhead />}
						size="lg"
						variant="link"
					>
						Try For Free
					</ScrollButton>
				)}
			</div>
		</header>
	);
}
