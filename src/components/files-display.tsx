import { ApplicationFile } from "@/types/api-types";
import { formatBytes } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { FileTextIcon, X } from "lucide-react";

export function FileCard({ file, handleRemoveFile }: { file: ApplicationFile | File; handleRemoveFile: () => void }) {
	return (
		<div
			className="relative flex justify-between gap-4 rounded-lg border shadow-sm"
			data-testid={`file-card-${file.name}`}
		>
			<div className="flex p-2 items-center justify-center">
				<FileTextIcon
					aria-hidden="true"
					className="h-4 w-4 text-accent-foreground"
					data-testid="file-preview-icon"
				/>
			</div>
			<div className="flex gap-2 items-center">
				<span className="truncate" data-testid={`file-name-display-${file.name}`}>
					{file.name}
				</span>
				<span className="text-xs" data-testid="file-size">
					({formatBytes(file.size)})
				</span>
			</div>
			<Button
				className="self-end"
				data-testid="remove-file-button"
				onClick={handleRemoveFile}
				size="icon"
				type="button"
				variant="ghost"
			>
				<X className="h-4 w-4" />
				<span className="sr-only">Remove file</span>
			</Button>
		</div>
	);
}

export function FilesDisplay({
	files,
	onFileRemoved,
}: {
	files: (ApplicationFile | File)[];
	onFileRemoved: (file: ApplicationFile | File) => void;
}) {
	return files.length ? (
		<div className="space-y-2 flex flex-col gap-1" data-testid="files-display">
			{files.map((file, index) => {
				return (
					<FileCard
						file={file}
						handleRemoveFile={() => {
							onFileRemoved(file);
						}}
						key={file.name + index.toString()}
					/>
				);
			})}
		</div>
	) : null;
}
