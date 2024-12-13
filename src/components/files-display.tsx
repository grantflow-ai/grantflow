import { FileTextIcon, X } from "lucide-react";
import { formatBytes } from "@/utils/format";
import { Button } from "gen/ui/button";
import { FormFile } from "@/types/app-types";

export function FileCard({ file, handleRemoveFile }: { file: FormFile; handleRemoveFile: () => void }) {
	return (
		<div
			className="relative flex justify-between gap-4 rounded-lg border shadow-sm"
			data-testid={`file-card-${file.name}`}
		>
			<div className="flex p-2 items-center justify-center">
				<FileTextIcon
					className="h-4 w-4 text-accent-foreground"
					aria-hidden="true"
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
				type="button"
				variant="ghost"
				size="icon"
				className="self-end"
				onClick={handleRemoveFile}
				data-testid="remove-file-button"
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
	files: (FormFile | File)[];
	onFileRemoved: (file: FormFile) => void;
}) {
	return files.length ? (
		<div className="space-y-2 flex flex-col gap-1" data-testid="files-display">
			{files.map((file, index) => {
				return (
					<FileCard
						key={file.name + index.toString()}
						file={file}
						handleRemoveFile={() => {
							onFileRemoved(file);
						}}
					/>
				);
			})}
		</div>
	) : null;
}
