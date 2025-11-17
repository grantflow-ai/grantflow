import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AdminLayoutClient from "@/components/layout/admin-layout-client";
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

	return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
