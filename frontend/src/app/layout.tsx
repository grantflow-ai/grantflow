import "@/styles/globals.css";

import { PagePath } from "@/enums";
import { cn } from "@/lib/utils";
import { getEnv } from "@/utils/env";
import { fontCabin, fontSora, fontSourceSans } from "@/utils/fonts";

import type { Metadata } from "next";

export const metadata = {
	alternates: {
		canonical: PagePath.ROOT,
	},
	authors: [{ name: "GrantFlow.AI" }],
	description:
		"GrantFlow.ai transforms the complex grant application process into a fast, intelligent workflow. Try it for free!",
	formatDetection: {
		email: false,
		telephone: false,
	},
	keywords: ["grant writing", "research grants", "AI assistant", "funding applications", "academic grants"],
	metadataBase: new URL(getEnv().NEXT_PUBLIC_SITE_URL),
	openGraph: {
		description:
			"GrantFlow.ai transforms the complex grant application process into a fast, intelligent workflow. Try it for free!",
		emails: ["admin@grantflow.ai"],
		images: [
			{
				alt: "GrantFlow.AI Preview Image",
				height: 630,
				url: "https://www.grantflow.ai/opengraph-image.png",
				width: 1200,
			},
		],
		locale: "en_US",
		siteName: "GrantFlow.AI",
		title: "Ready to Focus on Research, Not Paperwork?",
		type: "website",
		url: new URL(getEnv().NEXT_PUBLIC_SITE_URL),
	},
	publisher: "GrantFlow.ai",
	referrer: "origin-when-cross-origin",
	title: "GrantFlow.AI",
} satisfies Metadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
				!function(){var i="analytics",analytics=window[i]=window[i]||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","screen","once","off","on","addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware","register"];analytics.factory=function(e){return function(){if(window[i].initialized)return window[i][e].apply(window[i],arguments);var n=Array.prototype.slice.call(arguments);if(["track","screen","alias","group","page","identify"].indexOf(e)>-1){var c=document.querySelector("link[rel='canonical']");n.push({__t:"bpc",c:c&&c.getAttribute("href")||void 0,p:location.pathname,u:location.href,s:location.search,t:document.title,r:document.referrer})}n.unshift(e);analytics.push(n);return analytics}};for(var n=0;n<analytics.methods.length;n++){var key=analytics.methods[n];analytics[key]=analytics.factory(key)}analytics.load=function(key,n){var t=document.createElement("script");t.type="text/javascript";t.async=!0;t.setAttribute("data-global-segment-analytics-key",i);t.src="https://cdn.segment.com/analytics.js/v1/" + key + "/analytics.min.js";var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r);analytics._loadOptions=n};analytics._writeKey="M5CP7BfkccD2I8k11pFE5qAcFjibdUyn";;analytics.SNIPPET_VERSION="5.2.0";
				analytics.load("M5CP7BfkccD2I8k11pFE5qAcFjibdUyn");
				analytics.page();
				}();
				`,
					}}
				/>
			</head>
			<body
				className={cn(
					"flex flex-col min-h-screen bg-background antialiased",
					fontCabin.variable,
					fontSourceSans.variable,
					fontSora.variable,
					"font-body",
				)}
			>
				{children}
			</body>
		</html>
	);
}
