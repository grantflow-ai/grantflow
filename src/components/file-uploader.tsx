"use client";

import { Cross2Icon, FileTextIcon, UploadIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import Dropzone, { type DropzoneProps, type FileRejection } from "react-dropzone";
import { toast } from "sonner";

import { useControllableState } from "@/hooks/use-controllable-state";
import { formatBytes } from "@/utils/format";
import { cn } from "gen/cn";
import { Button } from "gen/ui/button";
import { Progress } from "gen/ui/progress";
import { ScrollArea } from "gen/ui/scroll-area";
import { type HTMLAttributes, useCallback, useEffect, useMemo } from "react";

const DEFAULT_FILE_ACCEPTS = {
	// the format of accept is defined in MDN: https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker
	// we support here the files we can extract using such libraries as unstructured.io etc.
	"application/epub+zip": [".epub"],
	"application/msword": [".doc"],
	"application/pdf": [".pdf"],
	"application/pkcs7-signature": [".p7s"],
	"application/rtf": [".rtf"],
	"application/vnd.ms-excel": [".xls"],
	"application/vnd.ms-outlook": [".msg"],
	"application/vnd.ms-powerpoint": [".ppt"],
	"application/vnd.oasis.opendocument.text": [".odt"],
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
	"application/xml": [".xml"],
	"image/bmp": [".bmp"],
	"image/heic": [".heic"],
	"image/jpeg": [".jpg", ".jpeg"],
	"image/png": [".png"],
	"image/tiff": [".tiff"],
	"message/rfc822": [".eml"],
	"text/csv": [".csv"],
	"text/html": [".html"],
	"text/markdown": [".md"],
	"text/plain": [".txt"],
	"text/tab-separated-values": [".tsv"],
	"text/x-org": [".org"],
	"text/x-rst": [".rst"],
};

export function FileUploader({
	value: valueProp,
	onValueChange,
	onUpload,
	progresses,
	accept = DEFAULT_FILE_ACCEPTS,
	disabled = false,
	maxFileCount = Number.POSITIVE_INFINITY,
	maxSize = 1024 * 1024 * 20,
	className,
	...dropzoneProps
}: HTMLAttributes<HTMLDivElement> & {
	accept?: DropzoneProps["accept"];
	disabled?: boolean;
	maxFileCount?: DropzoneProps["maxFiles"];
	maxSize?: DropzoneProps["maxSize"];
	onUpload?: (files: File[]) => Promise<void>;
	onValueChange?: (files: File[]) => void;
	progresses?: Record<string, number>;
	value?: File[];
}) {
	const [files, setFiles] = useControllableState({
		prop: valueProp,
		onChange: onValueChange,
	});

	const onDrop = useCallback(
		(acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
			if (maxFileCount === 1 && acceptedFiles.length > 1) {
				toast.error("Cannot upload more than 1 file at a time");
				return;
			}

			const totalFiles = (files?.length ?? 0) + acceptedFiles.length;
			if (totalFiles > maxFileCount) {
				toast.error(`Cannot upload more than ${maxFileCount} files`);
				return;
			}

			const updatedFiles = (files ? [...files, ...acceptedFiles] : acceptedFiles).map((file) => {
				if (!Reflect.has(file, "previewUrl") && file.type.startsWith("image/")) {
					Reflect.set(file, "previewUrl", URL.createObjectURL(file));
				}
				return file;
			});

			setFiles(updatedFiles);

			if (rejectedFiles.length > 0) {
				for (const { file } of rejectedFiles) {
					toast.error(`File ${file.name} was rejected`);
				}
			}

			if (onUpload && updatedFiles.length > 0 && updatedFiles.length <= maxFileCount) {
				const target = updatedFiles.length > 1 ? `${updatedFiles.length} files` : "file";
				toast.promise(onUpload(updatedFiles), {
					loading: `Uploading ${target}...`,
					success: () => {
						setFiles([]);
						return `${target} uploaded`;
					},
					error: `Failed to upload ${target}`,
				});
			}
		},
		[files, maxFileCount, onUpload, setFiles],
	);

	const onRemove = useCallback(
		(index: number) => {
			const newFiles = files?.filter((_, i) => i !== index) ?? [];
			setFiles(newFiles);
			onValueChange?.(newFiles);
		},
		[files, setFiles, onValueChange],
	);

	useEffect(() => {
		return () => {
			for (const file of files ?? []) {
				const previewUrl = Reflect.get(file, "previewUrl") as string | undefined;
				if (previewUrl) {
					URL.revokeObjectURL(previewUrl);
				}
			}
		};
	}, [files]);

	const isDisabled = useMemo(
		() => disabled || (files?.length ?? 0) >= maxFileCount,
		[disabled, files?.length, maxFileCount],
	);

	const instructions = `You can upload ${maxFileCount === 1 ? "a single file" : "multiple files"} with a maximal size of ${formatBytes(maxSize)} each`;

	return (
		<div className="relative flex flex-col gap-6 overflow-hidden" data-testid="file-uploader">
			<Dropzone
				onDrop={onDrop}
				accept={accept}
				maxSize={maxSize}
				maxFiles={maxFileCount}
				multiple={maxFileCount > 1}
				disabled={isDisabled}
			>
				{({ getRootProps, getInputProps, isDragActive }) => (
					<div
						{...getRootProps()}
						className={cn(
							"group relative grid h-52 w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-5 py-2.5 text-center transition hover:bg-muted/25",
							"ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
							isDragActive && "border-muted-foreground/50",
							isDisabled && "pointer-events-none opacity-60",
							className,
						)}
						{...dropzoneProps}
						data-testid="dropzone"
					>
						<input {...getInputProps()} data-testid="file-input" />
						{isDragActive ? (
							<div
								className="flex flex-col items-center justify-center gap-4 sm:px-5"
								data-testid="drag-active-content"
							>
								<div className="rounded-full border border-dashed p-3">
									<UploadIcon className="size-7 text-muted-foreground" aria-hidden="true" />
								</div>
								<p className="font-medium text-muted-foreground">Drop the files here</p>
							</div>
						) : (
							<div
								className="flex flex-col items-center justify-center gap-4 sm:px-5"
								data-testid="drag-inactive-content"
							>
								<div className="rounded-full border border-dashed p-3">
									<UploadIcon className="size-7 text-muted-foreground" aria-hidden="true" />
								</div>
								<div className="flex flex-col gap-px">
									<p className="font-medium text-muted-foreground">
										Drag 'n' drop files here, or click to select files
									</p>
									<p className="text-sm text-muted-foreground/70" data-testid="drag-inactive-content-instructions">
										{instructions}
									</p>
								</div>
							</div>
						)}
					</div>
				)}
			</Dropzone>
			{files?.length ? (
				<ScrollArea className="h-fit w-full px-3" data-testid="file-list-container">
					<div className="flex max-h-48 flex-col gap-4">
						{files.map((file, index) => (
							<FileCard
								key={file.name + file.type}
								file={file}
								onRemove={() => {
									onRemove(index);
								}}
								progress={progresses?.[file.name]}
							/>
						))}
					</div>
				</ScrollArea>
			) : null}
		</div>
	);
}

function FileCard({
	file,
	progress,
	onRemove,
}: {
	file: File;
	progress?: number;
	onRemove: () => void;
}) {
	return (
		<div className="relative flex items-center gap-2.5" data-testid={`file-card-${file.name}`}>
			<div className="flex flex-1 gap-2.5">
				<FilePreview file={file} />
				<div className="flex w-full flex-col gap-2">
					<div className="flex flex-col gap-px">
						<p
							className="line-clamp-1 text-sm font-medium text-foreground/80"
							data-testid={`file-name-display-${file.name}`}
						>
							{file.name}
						</p>
						<p className="text-xs text-muted-foreground" data-testid="file-size">
							{formatBytes(file.size)}
						</p>
					</div>
					{progress ? <Progress value={progress} data-testid="file-progress" /> : null}
				</div>
			</div>
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="size-7"
					onClick={onRemove}
					data-testid="remove-file-button"
				>
					<Cross2Icon className="size-4" aria-hidden="true" />
					<span className="sr-only">Remove file</span>
				</Button>
			</div>
		</div>
	);
}

function FilePreview({ file }: { file: File }) {
	const previewUrl = Reflect.get(file, "previewUrl") as string | undefined;
	if (previewUrl) {
		return (
			<Image
				src={previewUrl}
				alt={file.name}
				width={48}
				height={48}
				loading="lazy"
				className="aspect-square shrink-0 rounded-md object-cover"
				data-testid="file-preview-image"
			/>
		);
	}

	return <FileTextIcon className="size-10 text-muted-foreground" aria-hidden="true" data-testid="file-preview-icon" />;
}
