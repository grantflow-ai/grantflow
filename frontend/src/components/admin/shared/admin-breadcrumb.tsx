"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { routes } from "@/utils/navigation";

interface AdminBreadcrumbProps {
	institutionName: string;
	tabLabel: string;
}

export function AdminBreadcrumb({ institutionName, tabLabel }: AdminBreadcrumbProps) {
	return (
		<nav aria-label="Breadcrumb" data-testid="admin-breadcrumb">
			<ol className="flex items-center gap-2 text-sm text-app-gray-600">
				<li>
					<span data-testid="breadcrumb-admin">Admin</span>
				</li>
				<li>
					<ChevronRight className="h-4 w-4" />
				</li>
				<li>
					<Link
						className="hover:text-app-gray-900 transition-colors"
						data-testid="breadcrumb-granting-institutions"
						href={routes.admin.grantingInstitutions.list()}
					>
						Granting Institutions
					</Link>
				</li>
				<li>
					<ChevronRight className="h-4 w-4" />
				</li>
				<li>
					<span className="font-medium text-app-gray-900" data-testid="breadcrumb-institution-name">
						{institutionName}
					</span>
				</li>
				<li>
					<ChevronRight className="h-4 w-4" />
				</li>
				<li>
					<span className="text-app-gray-600" data-testid="breadcrumb-tab-label">
						{tabLabel}
					</span>
				</li>
			</ol>
		</nav>
	);
}
