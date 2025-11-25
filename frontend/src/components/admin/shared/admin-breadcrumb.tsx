"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { routes } from "@/utils/navigation";

interface AdminBreadcrumbProps {
	institutionName: string;
	tabLabel: string;
}

export function AdminBreadcrumb({ institutionName }: AdminBreadcrumbProps) {
	return (
		<nav aria-label="Breadcrumb" data-testid="admin-breadcrumb">
			<ol className="flex items-center gap-2 text-sm text-app-gray-600">
				
			
				<li>
					<Link
						className="hover:text-app-gray-900 font-normal font-sans text-black text-base transition-colors"
						data-testid="breadcrumb-granting-institutions"
						href={routes.admin.grantingInstitutions.list()}
					>
						Granting Institutions
					</Link>
				</li>
				<li>
					<ChevronRight className="h-4 w-4 text-black" />
				</li>
				<li>
					<span className="font-normal font-sans  text-app-gray-400 text-xs" data-testid="breadcrumb-institution-name">
						{institutionName}
					</span>
				</li>
			
			</ol>
		</nav>
	);
}
