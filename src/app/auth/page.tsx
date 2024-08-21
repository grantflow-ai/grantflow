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

	return <Auth />;
}
