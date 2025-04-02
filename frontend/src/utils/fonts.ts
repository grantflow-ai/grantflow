import { Cabin, Inter as FontSans, Sora, Source_Sans_3 } from "next/font/google";

export const fontSans = FontSans({
	display: "swap",
	subsets: ["latin"],
	variable: "--font-sans",
});

export const fontCabin = Cabin({
	display: "swap",
	subsets: ["latin"],
	variable: "--font-heading",
	weight: ["400", "500", "600"],
});

export const fontSora = Sora({
	display: "swap",
	subsets: ["latin"],
	variable: "--font-button",
	weight: ["100", "200", "300", "400"],
});

export const fontSourceSans = Source_Sans_3({
	display: "swap",
	subsets: ["latin"],
	variable: "--font-body",
});
