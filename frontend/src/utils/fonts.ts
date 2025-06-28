/* c8 ignore start */
import { Cabin, Sora, Source_Sans_3 } from "next/font/google";

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
	weight: ["100", "200", "300", "400", "500"],
});

export const fontSourceSans = Source_Sans_3({
	display: "swap",
	subsets: ["latin"],
	variable: "--font-body",
	weight: ["400", "500", "600"],
});
/* c8 ignore stop */