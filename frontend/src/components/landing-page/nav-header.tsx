"use client";

import { Logo, LogoDark } from "@/components/logo";
import { IconCancel, IconGoAhead, IconHamburger } from "@/components/landing-page/icons";
import { AppButton } from "@/components/app-button";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

const BREAKPOINT_MD = 768;

export function NavHeader() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
			<div className="flex justify-between items-center px-4 md:px-10 lg:px-20 xl:px-30 border-b border-b-gray-400/20">
				<Logo
					className={`h-12 sm:h-13 md:h-14 lg:h-15 xl:h-16 my-1 md:my-2 lg:my-4 xl:my-6 w-auto transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-0" : "opacity-100"}`}
					height="auto"
					width="auto"
				/>
				<LogoDark
					className={`absolute h-12 sm:h-13 md:h-14 lg:h-15 xl:h-16 my-1 md:my-2 lg:my-4 xl:my-6 w-auto transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-100" : "opacity-0"}`}
					height="auto"
					width="auto"
				/>
				<div className="hidden md:flex gap-6 items-center">
					<AppButton size="lg" theme="light" variant="link">
						About us
					</AppButton>
					<AppButton rightIcon={<IconGoAhead />} size="lg">
						Try For Free
					</AppButton>
				</div>
				<Button
					aria-label={isMobileMenuOpen ? "Close Navigation Menu" : "Open Navigation Menu"}
					className={`relative md:hidden bg-transparent hover:bg-transparent transition-colors duration-300 ${isMobileMenuOpen ? "text-primary" : "text-white"}`}
					onClick={() => {
						setIsMobileMenuOpen(!isMobileMenuOpen);
					}}
					size="icon"
				>
					<IconHamburger
						className={`absolute transition-all duration-300 ease-in-out
							${isMobileMenuOpen ? "opacity-0 transform rotate-90 scale-0" : "opacity-100 transform rotate-0 scale-100"}
							`}
						height={30}
						width={30}
					/>
					<IconCancel
						className={`absolute transition-all duration-300 ease-in-out
							${isMobileMenuOpen ? "opacity-100 transform rotate-0 scale-100" : "opacity-0 transform rotate-90 scale-0"}
							`}
						height={30}
						width={30}
					/>
				</Button>
			</div>
			<div
				className={`absolute left-0 right-0 top-full md:hidden bg-white py-4 px-4 sm:px-6 flex flex-col gap-4
				transition-all duration-300 ease-in-out
				${isMobileMenuOpen ? "max-h-lg opacity-100" : "max-h-sm opacity-0"}
				`}
			>
				<AppButton size="lg" variant="link">
					About us
				</AppButton>
				<AppButton size="lg" variant="link">
					Try For Free
				</AppButton>
			</div>
		</header>
	);
}
