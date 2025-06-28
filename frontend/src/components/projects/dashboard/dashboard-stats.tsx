"use client";

import useSWR from "swr";

import { getProjects } from "@/actions/project";
import type { API } from "@/types/api-types";

interface DashboardStatsProps {
	initialProjects: API.ListProjects.Http200.ResponseBody;
}

export function DashboardStats({ initialProjects }: DashboardStatsProps) {
	const { data: projects = initialProjects } = useSWR("projects", getProjects, {
		fallbackData: initialProjects,
		revalidateOnFocus: false,
	});

	const projectCount = projects.length;
	const applicationCount = projects.reduce(
		(total: number, project: API.ListProjects.Http200.ResponseBody[number]) => total + project.applications_count,
		0,
	);

	return (
		<div className="flex w-full flex-row items-start justify-start gap-8" data-testid="dashboard-stats">
			<div className="relative flex-1 rounded-lg bg-surface-primary border border-border-primary">
				<div className="flex flex-col items-start justify-start gap-2.5 px-8 py-6">
					<div
						className="text-[48px] font-semibold leading-[58px] text-text-primary font-heading"
						data-testid="project-count"
					>
						{projectCount}
					</div>
					<div className="text-[20px] font-normal leading-[30px] text-text-secondary font-body">
						Research projects
					</div>
				</div>
			</div>
			<div className="relative flex-1 rounded-lg bg-surface-primary border border-border-primary">
				<div className="flex flex-col items-start justify-start gap-2.5 px-8 py-6">
					<div
						className="text-[48px] font-semibold leading-[58px] text-text-primary font-heading"
						data-testid="application-count"
					>
						{applicationCount}
					</div>
					<div className="text-[20px] font-normal leading-[30px] text-text-secondary font-body">
						Applications
					</div>
				</div>
			</div>
		</div>
	);
}
