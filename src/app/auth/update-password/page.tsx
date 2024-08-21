import { redirect } from "next/navigation";

import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { AUTH_METHOD_PASSWORD_SIGNIN, getEnabledAuthMethods } from "@/config/auth";
import { PagePath } from "@/config/enums";
import { getServerClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";

export default async function UpdatePasswordPage() {
	const supabase = getServerClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const enabledAuthMethods = getEnabledAuthMethods();

	if (user || !enabledAuthMethods.has(AUTH_METHOD_PASSWORD_SIGNIN)) {
		return redirect(PagePath.AUTH);
	}

	return (
		<div className="flex justify-center" data-testid="auth-view">
			<Card className="w-96" data-testid="card-container">
				<CardHeader className="pb-0" data-testid="card-header">
					<CardTitle data-testid="card-title">Update Password</CardTitle>
				</CardHeader>
				<CardContent data-testid="card-content">
					<UpdatePasswordForm />
				</CardContent>
			</Card>
		</div>
	);
}
