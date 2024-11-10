import Image from "next/image";
import { FileTextIcon, X } from "lucide-react";
import { formatBytes } from "@/utils/format";
import { Button } from "gen/ui/button";

export type FileAttributes = Pick<File, "name" | "type" | "size">;

export function FilePreview({ file, previewUrl }: { file: FileAttributes; previewUrl?: string }) {
	if (previewUrl) {
		return (
			<Image
				src={previewUrl}
				alt={file.name || "file thumbnail"}
				width={48}
				height={48}
				className="rounded-md object-cover"
				data-testid="file-preview-image"
			/>
		);
	}

	return (
		<div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100">
			<FileTextIcon className="h-6 w-6 text-gray-400" aria-hidden="true" data-testid="file-preview-icon" />
		</div>
	);
}

export function FileCard({
	file,
	handleRemoveFile,
	previewUrl,
}: {
	file: FileAttributes;
	handleRemoveFile: () => void;
	previewUrl?: string;
}) {
	return (
		<div
			className="relative flex items-center gap-4 rounded-lg border p-1 shadow-sm"
			data-testid={`file-card-${file.name}`}
		>
			<FilePreview file={file} previewUrl={previewUrl} />
			<div className="flex flex-1 flex-col gap-1">
				<p className="text-sm font-medium truncate" data-testid={`file-name-display-${file.name}`}>
					{file.name}
				</p>
				<p className="text-xs text-gray-500" data-testid="file-size">
					{formatBytes(file.size)}
				</p>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="absolute top-1 right-1"
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
	files: (FileAttributes | File)[];
	onFileRemoved: (file: FileAttributes) => void;
}) {
	return files.length ? (
		<div className="space-y-2 flex flex-col gap-1" data-testid="files-display">
			{files.map((file, index) => {
				const previewUrl =
					file.type.startsWith("image/") && file instanceof Blob ? URL.createObjectURL(file) : undefined;
				return (
					<FileCard
						key={file.name + index.toString()}
						previewUrl={previewUrl}
						file={file}
						handleRemoveFile={() => {
							onFileRemoved(file);
							if (previewUrl) {
								URL.revokeObjectURL(previewUrl);
							}
						}}
					/>
				);
			})}
		</div>
	) : null;
}
