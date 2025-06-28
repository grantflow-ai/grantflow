import { FileTextIcon, X } from "lucide-react";

import { AppButton } from "@/components/app";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatBytes } from "@/utils/format";

export function FileCard({ file, handleRemoveFile }: { file: File; handleRemoveFile: () => void }) {
	return (
		<div
			className="bg-card text-card-foreground relative flex items-center justify-between gap-4 rounded-lg border p-4 shadow-sm transition-all hover:shadow-md"
			data-testid={`file-card-${file.name}`}
		>
			<div className="flex items-center gap-3">
				<FileTextIcon
					aria-hidden="true"
					className="text-muted-foreground size-8"
					data-testid="file-preview-icon"
				/>
				<div className="flex flex-col">
					<span className="max-w-[200px] truncate font-medium" data-testid={`file-name-display-${file.name}`}>
						{file.name}
					</span>
					<span className="text-muted-foreground text-xs" data-testid="file-size">
						{formatBytes(file.size)}
					</span>
				</div>
			</div>
			<AppButton
				aria-label={`Remove ${file.name}`}
				className="absolute right-1 top-1"
				data-testid="remove-file-button"
				onClick={handleRemoveFile}
				size="sm"
				variant="ghost"
			>
				<X className="size-4" />
				<span className="sr-only">Remove file</span>
			</AppButton>
		</div>
	);
}

export function FilesDisplay({ files, onFileRemoved }: { files: File[]; onFileRemoved: (file: File) => void }) {
	return files.length ? (
		<ScrollArea className="h-[200px] w-full rounded-md border" data-testid="files-scroll-area">
			<div className="space-y-2 p-4" data-testid="files-display">
				{files.map((file, index) => (
					<FileCard
						file={file}
						handleRemoveFile={() => {
							onFileRemoved(file);
						}}
						key={file.name + index.toString()}
					/>
				))}
			</div>
		</ScrollArea>
	) : null;
}