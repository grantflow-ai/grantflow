"use server";

import { redirect } from "next/navigation";
import { routes } from "@/utils/navigation";

// Application detail page - redirects to wizard by default
export default function ApplicationDetailPage() {
	redirect(routes.application.wizard());
}
