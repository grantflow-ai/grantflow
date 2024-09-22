import Image from "next/image";

import { type SupportedLocale, getLocale } from "@/i18n";
import { getServerClient } from "@/utils/supabase/server";
import { cn } from "gen/cn";
import { Button, buttonVariants } from "gen/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function LandingPage({
	params: { lang },
}: {
	params: { lang: SupportedLocale };
}) {
	const supabase = getServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		redirect(`/${user.id}`);
	}

	const locale = await getLocale(lang);

	return (
		<section className="container flex flex-col md:flex-row md:h-[calc(100dvh-10rem)] h-[calc(100dvh-8rem)]">
			<div className="w-full md:w-1/2  pt-8 flex flex-col gap-3 md:gap-4 justify-center text-center md:text-left">
				<h1
					className="text-balance text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl"
					data-testid="landing-title"
				>
					{locale.landingPage.title}
				</h1>
				<p
					className="text-sm max-w-screen-md text-balance  text-muted-foreground sm:text-xl sm:leading-8"
					data-testid="landing-description"
				>
					{locale.landingPage.description}
				</p>
				<Link href={`${lang}/auth`}>
					<Button className={cn(buttonVariants({ variant: "default", size: "lg" }))} data-testid="landing-cta">
						{locale.landingPage.cta}
					</Button>
				</Link>
			</div>
			<div className="w-full md:w-1/2 flex items-center justify-center">
				<div className="aspect-video w-full max-w-2xl">
					<Image
						width="1000"
						height="600"
						src="/images/screenshot.png"
						alt={"screenshot"}
						className="w-full h-auto"
						data-testid="landing-screenshot"
					/>
				</div>
			</div>
		</section>
	);
}
