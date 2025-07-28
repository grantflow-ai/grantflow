import { redirect } from "next/navigation";
import { routes } from "@/utils/navigation";

export default function ApplicationDetailPage() {
	redirect(routes.organization.project.application.wizard());
}
