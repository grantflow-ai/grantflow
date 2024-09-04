import { Cross2Icon, FileTextIcon, UploadIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import Dropzone, { type DropzoneProps, type FileRejection } from "react-dropzone";
import { toast } from "sonner";

import { generateUploadUrls } from "@/actions/file";
import { useControllableState } from "@/hooks/use-controllable-state";
import { formatBytes } from "@/utils/format";
import { clientLogger } from "@/utils/logging/client";
import axios from "axios";
import { cn } from "gen/cn";
import { Button } from "gen/ui/button";
import { Progress } from "gen/ui/progress";
import { ScrollArea } from "gen/ui/scroll-area";
import { nanoid } from "nanoid";
import { type HTMLAttributes, useCallback, useEffect, useMemo, useState } from "react";

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

async function handleFileUpload(files: File[], setProgresses: (progresses: Record<string, number>) => void) {
	const target = files.length > 1 ? `${files.length} files` : "file";
	const fileDataMapping = Object.fromEntries(files.map((file) => [file.name, [file.type, nanoid()]]));
	try {
		const fileIdToUploadURLMap = await generateUploadUrls(Object.values(fileDataMapping) as [string, string][]);

		const progresses: Record<string, number> = {};

		const promises = files.map(async (file) => {
			const [fileType, fileId] = fileDataMapping[file.name];
			const uploadUrl = fileIdToUploadURLMap.get(fileId);

			if (!uploadUrl) {
				throw new Error(`No upload URL found for file: ${file.name}`);
			}

			await axios.put(uploadUrl, file, {
				headers: {
					"Content-Type": fileType,
				},
				onUploadProgress: (progressEvent) => {
					if (progressEvent.total) {
						progresses[file.name] = Math.round((progressEvent.loaded * 100) / progressEvent.total);
						setProgresses({ ...progresses });
					}
				},
			});
		});
		await Promise.all(promises);
	} catch {
		clientLogger.debug(fileDataMapping, `Failed to upload ${target}`);
		toast.error(`Failed to upload ${target}`);
	}
}

export function FileUploader({
	accept = DEFAULT_FILE_ACCEPTS,
	className,
	disabled = false,
	maxFileCount = Number.POSITIVE_INFINITY,
	maxSize = 1024 * 1024 * 20,
	onProgressChange,
	onValueChange,
	progresses: progressesProp,
	value: valueProp,
	...dropzoneProps
}: HTMLAttributes<HTMLDivElement> &
	DropzoneProps & {
		disabled?: boolean;
		maxFileCount?: number;
		onProgressChange?: (progresses: Record<string, number>) => void;
		onValueChange?: (files: File[]) => void;
		progresses?: Record<string, number>;
		value?: File[];
	}) {
	const [files, setFiles] = useControllableState({
		prop: valueProp,
		onChange: onValueChange,
	});
	const [progresses, setProgresses] = useControllableState({
		prop: progressesProp,
		onChange: onProgressChange,
	});

	const [previewUrls, setPreviewUrls] = useState(new Map<string, string>());

	const validateFileUploads = useCallback(
		(newFileUploads: File[]) => {
			if (maxFileCount === 1 && newFileUploads.length > 1) {
				toast.error("Cannot upload more than 1 file at a time");
				return false;
			}

			const totalFiles = (files?.length ?? 0) + newFileUploads.length;
			if (totalFiles > maxFileCount) {
				toast.error(`Cannot upload more than ${maxFileCount} files`);
				return false;
			}

			return true;
		},
		[maxFileCount, files],
	);

	const onDrop = useCallback(
		(acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
			if (validateFileUploads(acceptedFiles)) {
				const updatedFiles = [...(files ?? []), ...acceptedFiles];

				setFiles(updatedFiles);

				if (rejectedFiles.length > 0) {
					for (const { file } of rejectedFiles) {
						toast.error(`File ${file.name} was rejected`);
					}
				}

				if (updatedFiles.length) {
					void handleFileUpload(updatedFiles, setProgresses);
				}
			}
		},
		[validateFileUploads, files, setProgresses, setFiles],
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
		for (const file of files ?? []) {
			if (!previewUrls.has(file.name) && file.type.startsWith("image/")) {
				setPreviewUrls(new Map(previewUrls).set(file.name, URL.createObjectURL(file)));
			}
		}

		for (const fileName of previewUrls.keys()) {
			if (!files?.some((file) => file.name === fileName)) {
				previewUrls.delete(fileName);
			}
		}

		return () => {
			for (const previewUrl of previewUrls.values()) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [files, previewUrls]);

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
								previewUrl={previewUrls.get(file.name)}
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
	previewUrl,
}: {
	file: File;
	progress?: number;
	onRemove: () => void;
	previewUrl?: string;
}) {
	return (
		<div className="relative flex items-center gap-2.5" data-testid={`file-card-${file.name}`}>
			<div className="flex flex-1 gap-2.5">
				<FilePreview file={file} previewUrl={previewUrl} />
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

function FilePreview({ file, previewUrl }: { file: File; previewUrl?: string }) {
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
