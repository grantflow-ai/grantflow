import type { ApplicationStatus, DownloadFormat } from "@/types/download";

export const DOWNLOAD_FORMATS: Record<DownloadFormat, { extension: string; label: string }> = {
	docx: { extension: "docx", label: "Word (.docx)" },
	markdown: { extension: "md", label: "Markdown (.md)" },
	pdf: { extension: "pdf", label: "PDF (.pdf)" },
} as const;

export const APPLICATION_STATUS: Record<string, ApplicationStatus> = {
	CANCELLED: "CANCELLED",
	GENERATING: "GENERATING",
	IN_PROGRESS: "IN_PROGRESS",
	WORKING_DRAFT: "WORKING_DRAFT",
} as const;
