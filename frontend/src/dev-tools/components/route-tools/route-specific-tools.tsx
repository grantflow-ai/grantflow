"use client";

import { ApplicationTools } from "./application-tools";
import { DashboardTools } from "./dashboard-tools";
import { ProjectTools } from "./project-tools";
import { WizardTools } from "./wizard-tools";

interface RouteSpecificToolsProps {
	pathname: string;
}

export function RouteSpecificTools({ pathname }: RouteSpecificToolsProps) {
	const getToolsComponent = () => {
		if (pathname === "/") {
			return <DashboardTools />;
		}
		if (pathname.includes("/wizard")) {
			return <WizardTools />;
		}
		if (pathname.includes("/applications/")) {
			return <ApplicationTools />;
		}
		if (pathname.includes("/projects/")) {
			return <ProjectTools />;
		}
		return <DefaultTools pathname={pathname} />;
	};

	return (
		<div className="space-y-6">
			<h3 className="text-lg font-semibold">Route-Specific Tools</h3>
			<div className="rounded-lg bg-gray-800 p-4">
				<p className="mb-4 text-sm text-gray-400">Current Route: {pathname}</p>
				{getToolsComponent()}
			</div>
		</div>
	);
}

function DefaultTools({ pathname }: { pathname: string }) {
	return (
		<div className="text-center text-gray-500">
			<p>No specific tools available for this route.</p>
			<p className="mt-2 text-sm">Route: {pathname}</p>
		</div>
	);
}
