import Image from "next/image";
import { cn } from "@/lib/utils";
import { useApplicationStore } from "@/stores/application-store";

const FILE_ICON_MAP = {
	csv: <Image alt="CSV file" height={20} src="/icons/file-csv.svg" width={20} />,
	doc: <Image alt="DOC file" height={20} src="/icons/file-doc.svg" width={20} />,
	docx: <Image alt="DOCX file" height={20} src="/icons/file-docx.svg" width={20} />,
	latex: <Image alt="LaTeX file" height={20} src="/icons/file-general.svg" width={20} />,
	markdown: <Image alt="Markdown file" height={20} src="/icons/file-markdown.svg" width={20} />,
	md: <Image alt="Markdown file" height={20} src="/icons/file-markdown.svg" width={20} />,
	odt: <Image alt="ODT file" height={20} src="/icons/file-general.svg" width={20} />,
	pdf: <Image alt="PDF file" height={20} src="/icons/file-pdf.svg" width={20} />,
	ppt: <Image alt="PPT file" height={20} src="/icons/file-ppt.svg" width={20} />,
	pptx: <Image alt="PPTX file" height={20} src="/icons/file-pptx.svg" width={20} />,
	rst: <Image alt="RST file" height={20} src="/icons/file-general.svg" width={20} />,
	rtf: <Image alt="RTF file" height={20} src="/icons/file-general.svg" width={20} />,
	txt: <Image alt="TXT file" height={20} src="/icons/file-general.svg" width={20} />,
	xlsx: <Image alt="XLSX file" height={20} src="/icons/file-general.svg" width={20} />,
} as const;

const statusIcons = {
	CREATED: <Image alt="Created" height={20} src="/icons/icon-toast-info.svg" width={20} />,
	FAILED: <Image alt="Failed" height={20} src="/icons/indexing-failure.svg" width={20} />,
	FINISHED: <Image alt="Success" height={20} src="/icons/indexing-success.svg" width={20} />,
	INDEXING: <Image alt="Processing" className="animate-spin" height={20} src="/icons/generating.svg" width={20} />,
};

export function RagSourcesContent() {
	const grantTemplate = useApplicationStore((state) => state.application?.grant_template);

	const ragSources = grantTemplate?.rag_sources ?? [];

	if (!grantTemplate) {
		return (
			<div className="space-y-4" data-testid="rag-sources-no-template">
				<p className="text-sm text-gray-600">No template found. Please create or reload the application.</p>
			</div>
		);
	}

	if (ragSources.length === 0) {
		return (
			<div className="space-y-4" data-testid="rag-sources-empty">
				<p className="text-sm text-gray-600">No documents or URLs have been added to the knowledge base yet.</p>
			</div>
		);
	}

	const renderSourceItem = (source: (typeof ragSources)[0], index: number) => {
		const displayName = source.filename ?? source.url ?? "Unknown source";
		const { status } = source;
		const isLast = index === ragSources.length - 1;

		return (
			<div
				className={cn("flex items-center py-2", !isLast && "border-b border-gray-200")}
				data-testid={`rag-source-${source.sourceId}`}
				key={source.sourceId}
			>
				<div className="p-2 flex justify-center items-center">
					{source.filename ? (
						getFileIcon(source.filename)
					) : (
						<Image alt="URL" height={20} src="/icons/globe.svg" width={20} />
					)}
				</div>

				<div className="flex-1 p-2 flex justify-center items-center">
					<p className="text-xs font-normal text-app-gray-700 truncate text-center">{displayName}</p>
				</div>

				<div className="flex-[2] p-2 flex justify-center items-center">
					{status === "FAILED" && (
						<p className="text-xs font-normal text-red truncate text-center">
							{source.filename
								? "We couldn't read this file. It might be damaged or incomplete."
								: "This link couldn't be reached."}
						</p>
					)}
					{status === "FINISHED" && (
						<p className="text-xs font-normal text-app-file-status-green truncate text-center">
							{source.filename
								? "File successfully analyzed and ready to use."
								: "Link scanned successfully. Content has been indexed."}
						</p>
					)}
					{status === "CREATED" && (
						<p className="text-xs font-normal text-app-gray-700 truncate text-center">Processing...</p>
					)}
					{status === "INDEXING" && (
						<p className="text-xs font-normal text-app-gray-700 truncate text-center">
							Analyzing content...
						</p>
					)}
					{!["CREATED", "FAILED", "FINISHED", "INDEXING"].includes(status) && (
						<p className="text-xs font-normal text-app-gray-700 truncate text-center">Status: {status}</p>
					)}
				</div>

				<div className="p-2 flex justify-center items-center">{statusIcons[status]}</div>
			</div>
		);
	};

	return (
		<div className="space-y-4" data-testid="rag-sources-content">
			<div className="max-h-96 overflow-y-auto" data-testid="rag-sources-list">
				{ragSources.map((source, index) => renderSourceItem(source, index))}
			</div>
		</div>
	);
}

function getFileExtension(filename: string) {
	const parts = filename.split(".");
	return parts.length > 1 ? parts.at(-1)?.toLowerCase() : "";
}

function getFileIcon(filename: string) {
	const extension = getFileExtension(filename) ?? "";
	if (!extension) {
		return <Image alt="File" height={20} src="/icons/file-general.svg" width={20} />;
	}
	return FILE_ICON_MAP[extension as keyof typeof FILE_ICON_MAP];
}
