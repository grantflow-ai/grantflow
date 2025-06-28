"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconGoAhead } from "@/components/branding/icons";
import { LogoDark } from "@/components/branding/logo";
import { IconCancel, IconHamburger } from "@/components/landing-page/icons";
import { PagePath } from "@/enums";
import { cn } from "@/lib/utils";
import { disableScroll, enableScroll } from "@/utils/window";
import { LandingPageButton } from "./button";
import { LandingPageScrollButton } from "./scroll-button";

const BREAKPOINT_MD = 768;

const NavLink = ({
	className = "",
	href,
	isActive,
	label,
	onClick,
	theme = "light",
}: {
	className?: string;
	href: string;
	isActive: boolean;
	label: string;
	onClick?: () => void;
	theme?: "dark" | "light";
}) => {
	const getActiveClass = () => {
		if (!isActive) return "";
		return theme === "light" ? "text-link-hover-light" : "text-link-hover-dark";
	};

	return (
		<LandingPageButton
			aria-label={`Go to ${label} Page`}
			className={cn(getActiveClass(), className)}
			size="lg"
			theme={theme}
			variant="link"
		>
			<Link href={href} onClick={onClick}>
				{label}
			</Link>
		</LandingPageButton>
	);
};

const LogoSection = () => (
	<Link aria-label="Go to homepage" href={PagePath.ROOT}>
		<LogoDark
			className={
				"sm:h-13 lg:h-15 my-1 h-12 w-auto transition-opacity duration-300 md:my-2 md:h-14 lg:my-4 xl:my-6 xl:h-16"
			}
		/>
	</Link>
);

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

	useEffect(() => {
		if (isMobileMenuOpen) {
			disableScroll();
		} else {
			enableScroll();
		}

		return enableScroll;
	}, [isMobileMenuOpen]);

	return (
		<header
			className={"relative z-50 w-full bg-transparent transition-colors duration-300"}
			data-testid="nav-header"
		>
			<div
				className="z-50 flex items-center justify-between px-4 md:px-5 lg:px-6 xl:px-7"
				data-testid="nav-header-container"
			>
				<LogoSection />
				<div className="hidden items-center md:flex" data-testid="nav-header-links">
					<NavLink
						className="text-app-slate-blue"
						href={PagePath.ROOT}
						isActive={pathname === PagePath.ROOT.toString()}
						label="Home"
						theme="light"
					/>
					{isHomePage && (
						<LandingPageScrollButton
							aria-label="Prices"
							desktopTargetId="payment-plans"
							mobileTargetId="payment-plans"
							onClick={() => {
								setIsMobileMenuOpen(false);
							}}
							size="lg"
							variant="link"
						>
							Prices
						</LandingPageScrollButton>
					)}
					<NavLink href={PagePath.ABOUT_US} isActive={false} label="About us" theme="dark" />
					{isHomePage && (
						<LandingPageScrollButton
							aria-label="Go to Waitlist Form"
							className="ms-6"
							desktopTargetId="waitlist"
							rightIcon={<IconGoAhead />}
							size="lg"
						>
							Secure Priority Access
						</LandingPageScrollButton>
					)}
				</div>
				<LandingPageButton
					aria-label={isMobileMenuOpen ? "Close Navigation Menu" : "Open Navigation Menu"}
					className={`relative bg-transparent transition-colors duration-300 hover:bg-transparent md:hidden ${isMobileMenuOpen ? "text-primary" : "text-white"}`}
					onClick={() => {
						setIsMobileMenuOpen(!isMobileMenuOpen);
					}}
					size="sm"
					variant="ghost"
				>
					<IconHamburger
						className={`text-app-black absolute transition-all duration-300 ease-in-out ${isMobileMenuOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"} `}
						height={30}
						width={30}
					/>
					<IconCancel
						className={`absolute text-white transition-all duration-300 ease-in-out
							${isMobileMenuOpen ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"}
							`}
						height={30}
						width={30}
					/>
				</LandingPageButton>
			</div>
			{isMobileMenuOpen && (
				<button
					aria-label="dismiss menu"
					className="fixed inset-0 z-0 bg-black/40"
					onClick={() => {
						setIsMobileMenuOpen(false);
					}}
					type="button"
				/>
			)}
			<div
				aria-hidden={!isMobileMenuOpen}
				className={`absolute right-0 top-0 flex flex-col items-start bg-white px-3 py-6 transition-all duration-300 ease-in-out sm:px-6 md:hidden
				${isTermsPage && isMobileMenuOpen ? "border-primary border-b" : ""}
				${isMobileMenuOpen ? "pointer-events-auto h-dvh w-2/3 min-w-min opacity-100" : "max-h-sm pointer-events-none opacity-0"}
				`}
				data-testid="mobile-menu"
			>
				<button
					className="cursor-pointer self-end"
					onClick={() => {
						setIsMobileMenuOpen(false);
					}}
					type="button"
				>
					<Image alt="close" aria-hidden="false" height={16} priority src="/assets/cross.svg" width={16} />
				</button>
				<NavLink
					className="text-app-slate-blue mt-3"
					href={PagePath.ROOT}
					isActive={pathname === PagePath.ROOT.toString()}
					label="Home"
					onClick={() => {
						setIsMobileMenuOpen(false);
					}}
					theme="light"
				/>
				{isHomePage && (
					<LandingPageScrollButton
						aria-label="Prices"
						mobileTargetId="payment-plans"
						onClick={() => {
							setIsMobileMenuOpen(false);
						}}
						size="lg"
						variant="link"
					>
						Prices
					</LandingPageScrollButton>
				)}
				<NavLink
					href={PagePath.ABOUT_US}
					isActive={pathname === PagePath.ABOUT_US.toString()}
					label="About us"
					onClick={() => {
						setIsMobileMenuOpen(false);
					}}
					theme="dark"
				/>
				{isHomePage && (
					<LandingPageScrollButton
						aria-label="Go to Waitlist Form"
						className="mt-auto w-full"
						mobileTargetId="waitlist-form-container"
						offset={80}
						onClick={() => {
							setIsMobileMenuOpen(false);
						}}
						rightIcon={<IconGoAhead />}
						size="lg"
					>
						Secure Priority Access
					</LandingPageScrollButton>
				)}
			</div>
		</header>
	);
}
