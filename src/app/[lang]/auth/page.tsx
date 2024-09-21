import { Auth } from "@/components/auth/auth";
import { PagePath } from "@/config/enums";
import { getServerClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function AuthPage() {
	const supabase = getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		return redirect(PagePath.ROOT);
	}

	return (
		<>
			<section className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-20">
				<div className="container mx-auto text-center">
					<h1 className="text-5xl font-bold mb-4">Welcome to Our App</h1>
					<p className="text-xl mb-8">Sign in or create an account to get started</p>
				</div>
			</section>
			<section className="container flex justify-center mt-10">
				<Auth />
			</section>
		</>
	);
}
