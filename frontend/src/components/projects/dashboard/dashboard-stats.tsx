import type { API } from "@/types/api-types";

interface DashboardStatsProps {
  initialProjects: API.ListProjects.Http200.ResponseBody;
}

export function DashboardStats({ initialProjects }: DashboardStatsProps) {
    const projectCount = initialProjects.length;
    const applicationCount = initialProjects.reduce((acc, project) => acc + (project.applications?.length ?? 0), 0);

    return (
        <article className="flex gap-8 items-center w-full mt-6">
            <div className="w-full h-[130px]  border border-gray-200 rounded-sm px-6 py-6 flex flex-col gap-2.5">
                <h4 className="font-normal text-4xl text-black">{projectCount}</h4>
                <p className="font-normal text-2xl text-gray-600">
                    Research projects
                </p>
            </div>
            <div className="w-full h-[130px]  border border-gray-200 rounded-sm px-6 py-6 flex flex-col gap-2.5">
                <h4 className="font-normal text-4xl text-black">{applicationCount}</h4>
                <p className="font-normal text-2xl text-gray-600">
                    Applications
                </p>
            </div>
        </article>
    );
}