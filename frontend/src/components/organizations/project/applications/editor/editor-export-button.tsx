import type { EditorRef } from "@grantflow/editor";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import type * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";

const DOWNLOAD_DISMISS_TIMEOUT = 4000;

export function EditorExportButton({ editorRef }: { editorRef: React.RefObject<EditorRef | null> }) {
	const [isLoading, setIsLoading] = useState(false);
	const [downloaded, setDownloaded] = useState(false);

	const handlePDFExport = async () => {
		await handleExport("pdf", "grant_application.pdf");
	};

	const handleDOCXExport = async () => {
		await handleExport("docx", "grant_application.docx");
	};

	const handleExport = async (format: "docx" | "pdf", filename: string) => {
		try {
			if (!editorRef.current) {
				throw new Error("Editor not available");
			}
			const htmlContent = editorRef.current.getHTML();

			if (!htmlContent.trim()) {
				toast.error("No content to export");
				return;
			}

			setIsLoading(true);

			const fileBlob = await withAuthRedirect(
				getClient()
					.post("files/convert", {
						headers: await createAuthHeaders(),
						json: {
							filename,
							html_content: htmlContent,
							output_format: format,
						},
					})
					.blob(),
			);

			const url = globalThis.URL.createObjectURL(fileBlob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `grant_application.${format}`;
			document.body.append(link);
			link.click();
			link.remove();
			globalThis.URL.revokeObjectURL(url);
			setDownloaded(true);

			setTimeout(() => {
				setDownloaded(false);
			}, DOWNLOAD_DISMISS_TIMEOUT);
		} catch {
			toast.error(`Failed to export ${format}. Please try again.`);
		} finally {
			setIsLoading(false);
		}
	};

	function renderLoader() {
		if (downloaded) {
			return <Image alt="done" height={16} src="/icons/check-circle.svg" width={16} />;
		}
		if (isLoading) {
			return <Loader2 className="size-4 animate-spin" />;
		}

		return <div className="w-4 h-4" />;
	}

	return (
		<div>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<div
						className="w-full bg-primary cursor-pointer tap-effect px-4 py-2 rounded-md flex items-center justify-between"
						data-testid="editor-export-button"
					>
						{renderLoader()}
						<p className="font-['Sora'] leading-5.5 text-white">Export as</p>
						<Image alt="Export" height={16} src="/icons/chevron-down-white.svg" width={16} />
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-[207px] rounded-lg" side={"bottom"}>
					<DropdownMenuItem data-testid="editor-export-list" onClick={handleDOCXExport}>
						<div className="flex items-center gap-1 text-base" data-testid="editor-export-list-item">
							<Image alt="DOC" height={29} src="/icons/file-doc.svg" width={21} />
							<span>DOC</span>
						</div>
					</DropdownMenuItem>
					<DropdownMenuItem data-testid="editor-export-pdf" onClick={handlePDFExport}>
						<div className="flex items-center gap-1 text-base" data-testid="editor-export-list-item">
							<Image alt="PDF" height={29} src="/icons/file-pdf.svg" width={21} />
							<span>PDF</span>
						</div>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
