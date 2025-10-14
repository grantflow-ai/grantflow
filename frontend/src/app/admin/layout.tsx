import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import SharedLayout from "@/components/layout/shared-layout";
import { SESSION_COOKIE } from "@/constants";
import { getBackofficeAdminFromJWT } from "@/utils/jwt";
import { routes } from "@/utils/navigation";

interface AdminLayoutProps {
	children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
	const cookieStore = await cookies();
	const jwt = cookieStore.get(SESSION_COOKIE)?.value;

	if (!jwt) {
		redirect(routes.login());
	}

	const isBackofficeAdmin = getBackofficeAdminFromJWT(jwt);

	if (!isBackofficeAdmin) {
		redirect(routes.organization.root());
	}

	return (
		<SharedLayout>
			<div className="min-h-screen bg-gray-50">
				<div className="mx-auto max-w-7xl">{children}</div>
			</div>
		</SharedLayout>
	);
}
