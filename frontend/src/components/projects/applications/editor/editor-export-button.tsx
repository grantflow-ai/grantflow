import Image from "next/image";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function EditorExportButton() {
	return (
		<div>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<div
						className="w-full bg-primary cursor-pointer tap-effect px-4 py-2 rounded-md flex items-center justify-between"
						data-testid="editor-export-button"
					>
						<div className="w-4 h-4" />
						<p className="font-['Sora'] leading-5.5 text-white">Export as</p>
						<Image alt="Export" height={16} src="/icons/chevron-down-white.svg" width={16} />
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-[207px] rounded-lg" side={"bottom"}>
					<DropdownMenuItem data-testid="editor-export-list">
						<div className="flex items-center gap-1 text-base" data-testid="editor-export-list-item">
							<Image alt="DOC" height={29} src="/icons/file-doc.svg" width={21} />
							<span>DOC</span>
						</div>
					</DropdownMenuItem>
					<DropdownMenuItem>
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
