import { PagePath } from "@/config/enums";
import { getServerClient } from "@/utils/supabase/server";
import Link from "next/link";

export default async function LandingPage() {
	const supabase = getServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	return (
		<section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
			<div className="flex max-w-[980px] flex-col items-start gap-2">
				<h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
					Fully featured Next.js template.
				</h1>
				<p className="max-w-[700px] text-lg text-muted-foreground">Next.js 14 Ready.</p>
			</div>
			<div className="flex gap-4">{user ? "Logged in" : <Link href={PagePath.AUTH}>Log In</Link>}</div>
		</section>
	);
}
