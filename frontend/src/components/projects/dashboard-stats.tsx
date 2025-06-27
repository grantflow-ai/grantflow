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
	const applicationCount = projects.reduce((total, project) => total + project.applications_count, 0);

	return (
		<div className="flex w-full flex-row items-start justify-start gap-8">
			<div className="relative min-h-px min-w-px grow shrink-0 basis-0 rounded bg-white">
				<div className="relative size-full overflow-clip">
					<div className="relative flex w-full flex-col items-start justify-start gap-2.5 px-8 py-6 font-normal leading-[0] text-left font-['Sora']">
						<div className="relative flex shrink-0 flex-col justify-center whitespace-nowrap text-[36px] text-[#2e2d36]">
							<p className="block whitespace-pre leading-[42px]">{projectCount}</p>
						</div>
						<div className="relative flex shrink-0 flex-col justify-center text-[24px] text-[#636170] w-[455px]">
							<p className="block leading-[30px]">Research projects</p>
						</div>
					</div>
				</div>
				<div className="pointer-events-none absolute inset-0 rounded border border-solid border-[#e1dfeb]" />
			</div>
			<div className="relative min-h-px min-w-px grow shrink-0 basis-0 rounded bg-white">
				<div className="relative size-full overflow-clip">
					<div className="relative flex w-full flex-col items-start justify-start gap-2.5 px-8 py-6 font-normal leading-[0] text-left font-['Sora']">
						<div className="relative flex shrink-0 flex-col justify-center text-[36px] text-[#2e2d36] w-[455px]">
							<p className="block leading-[42px]">{applicationCount}</p>
						</div>
						<div className="relative flex shrink-0 flex-col justify-center text-[24px] text-[#636170] w-[455px]">
							<p className="block leading-[30px]">Applications</p>
						</div>
					</div>
				</div>
				<div className="pointer-events-none absolute inset-0 rounded border border-solid border-[#e1dfeb]" />
			</div>
		</div>
	);
}
