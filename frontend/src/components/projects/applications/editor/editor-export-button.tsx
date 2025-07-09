import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function EditorExportButton() {
	return (
		<div>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						className="w-full bg-primary cursor-pointer tap-effect px-4 py-2 rounded-md flex items-center justify-between"
						type="button"
					>
						<div className="w-4 h-4" />
						<p className="font-['Sora'] leading-5.5 text-white">Export as</p>
						<Image alt="Export" height={16} src="/icons/chevron-down-white.svg" width={16} />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-[207px] rounded-lg" side={"bottom"}>
					<DropdownMenuItem className="flex items-center gap-1 text-base">
						<Image alt="DOC" height={29} src="/icons/file-doc.svg" width={21} />
						<span>DOC</span>
					</DropdownMenuItem>
					<DropdownMenuItem className="flex items-center gap-1 text-base">
						<Image alt="PDF" height={29} src="/icons/file-pdf.svg" width={21} />
						<span>PDF</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
