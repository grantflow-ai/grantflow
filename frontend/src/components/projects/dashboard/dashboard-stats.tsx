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
		<article className="flex gap-8 items-center w-full mt-6">
			<div className="w-full h-[130px]  border border-gray-200 rounded-sm px-6 py-6 flex flex-col gap-2.5">
				<h4 className="font-normal text-4xl text-black" data-testid="project-count">
					{projectCount}
				</h4>
				<p className="font-normal text-2xl text-gray-600">Research projects</p>
			</div>
			<div className="w-full h-[130px]  border border-gray-200 rounded-sm px-6 py-6 flex flex-col gap-2.5">
				<h4 className="font-normal text-4xl text-black" data-testid="application-count">
					{applicationCount}
				</h4>
				<p className="font-normal text-2xl text-gray-600">Applications</p>
			</div>
		</article>
	);
}
