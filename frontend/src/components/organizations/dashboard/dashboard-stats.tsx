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
		<article className="flex gap-8 items-center w-full" data-testid="dashboard-stats">
			<div className="w-full bg-white border border-app-gray-100 rounded px-8 py-6 flex flex-col gap-2.5">
				<h4
					className="font-button font-normal text-[36px] leading-[42px] text-app-black"
					data-testid="project-count"
				>
					{projectCount}
				</h4>
				<p className="font-button font-normal text-[24px] leading-[30px] text-app-gray-600">
					Research projects
				</p>
			</div>
			<div className="w-full bg-white border border-app-gray-100 rounded px-8 py-6 flex flex-col gap-2.5">
				<h4
					className="font-button font-normal text-[36px] leading-[42px] text-app-black"
					data-testid="application-count"
				>
					{applicationCount}
				</h4>
				<p className="font-button font-normal text-[24px] leading-[30px] text-app-gray-600">Applications</p>
			</div>
		</article>
	);
}
