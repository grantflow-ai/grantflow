import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import * as React from "react";
import { CloseIcon } from "@/components/editor/tiptap/components/tiptap-icons/close-icon";
import "@/components/editor/tiptap/components/tiptap-node/image-upload-node/image-upload-node.css";

export interface FileItem {
	abortController?: AbortController;
	file: File;
	id: string;
	progress: number;
	status: "error" | "success" | "uploading";
	url?: string;
}

interface UploadOptions {
	accept: string;
	limit: number;
	maxSize: number;
	onError?: (error: Error) => void;
	onSuccess?: (url: string) => void;
	upload: (file: File, onProgress: (event: { progress: number }) => void, signal: AbortSignal) => Promise<string>;
}

function useFileUpload(options: UploadOptions) {
	const [fileItem, setFileItem] = React.useState<FileItem | null>(null);

	const uploadFile = async (file: File): Promise<null | string> => {
		if (file.size > options.maxSize) {
			handleUploadError(
				new Error(`File size exceeds maximum allowed (${options.maxSize / 1024 / 1024}MB)`),
				{ signal: { aborted: false } } as AbortController, // dummy controller for this case
				setFileItem,
				options.onError,
			);
			return null;
		}

		const abortController = new AbortController();

		const newFileItem: FileItem = {
			abortController,
			file,
			id: crypto.randomUUID(),
			progress: 0,
			status: "uploading",
		};

		setFileItem(newFileItem);

		if (!options.upload) {
			handleUploadError(
				new Error("Upload function is not defined"),
				abortController,
				setFileItem,
				options.onError,
			);
			return null;
		}

		try {
			const url = await options.upload(
				file,
				(event: { progress: number }) => {
					setFileItem((prev) => (prev ? { ...prev, progress: event.progress } : null));
				},
				abortController.signal,
			);

			if (!url) {
				handleUploadError(
					new Error("Upload failed: No URL returned"),
					abortController,
					setFileItem,
					options.onError,
				);
				return null;
			}

			if (abortController.signal.aborted) {
				return null;
			}

			handleUploadSuccess(url, setFileItem, options.onSuccess);
			return url;
		} catch (error) {
			handleUploadError(error, abortController, setFileItem, options.onError);
			return null;
		}
	};

	const uploadFiles = async (files: File[]): Promise<null | string> => {
		if (!files || files.length === 0) {
			options.onError?.(new Error("No files to upload"));
			return null;
		}

		if (options.limit && files.length > options.limit) {
			options.onError?.(new Error(`Maximum ${options.limit} file${options.limit === 1 ? "" : "s"} allowed`));
			return null;
		}

		const file = files[0];
		if (!file) {
			options.onError?.(new Error("File is undefined"));
			return null;
		}

		return uploadFile(file);
	};

	const clearFileItem = () => {
		if (!fileItem) return;

		if (fileItem.abortController) {
			fileItem.abortController.abort();
		}
		if (fileItem.url) {
			URL.revokeObjectURL(fileItem.url);
		}
		setFileItem(null);
	};

	return {
		clearFileItem,
		fileItem,
		uploadFiles,
	};
}

const handleUploadError = (
	error: unknown,
	abortController: AbortController,
	setFileItem: React.Dispatch<React.SetStateAction<FileItem | null>>,
	onError?: (error: Error) => void,
) => {
	setFileItem((prev: FileItem | null) => {
		if (!prev) return null;
		return {
			...prev,
			progress: 0,
			status: "error",
		};
	});
	if (!abortController.signal.aborted) {
		onError?.(error instanceof Error ? error : new Error("Upload failed"));
	}
};

const handleUploadSuccess = (
	url: string,
	setFileItem: React.Dispatch<React.SetStateAction<FileItem | null>>,
	onSuccess?: (url: string) => void,
) => {
	setFileItem((prev: FileItem | null) => {
		if (!prev) return null;
		return {
			...prev,
			progress: 100,
			status: "success",
			url,
		};
	});
	onSuccess?.(url);
};

const CloudUploadIcon: React.FC = () => (
	<svg
		className="tiptap-image-upload-icon"
		fill="currentColor"
		height="24"
		viewBox="0 0 24 24"
		width="24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>Upload Icon</title>
		<path
			d="M11.1953 4.41771C10.3478 4.08499 9.43578 3.94949 8.5282 4.02147C7.62062 4.09345 6.74133 4.37102 5.95691 4.83316C5.1725 5.2953 4.50354 5.92989 4.00071 6.68886C3.49788 7.44783 3.17436 8.31128 3.05465 9.2138C2.93495 10.1163 3.0222 11.0343 3.3098 11.8981C3.5974 12.7619 4.07781 13.5489 4.71463 14.1995C5.10094 14.5942 5.09414 15.2274 4.69945 15.6137C4.30476 16 3.67163 15.9932 3.28532 15.5985C2.43622 14.731 1.79568 13.6816 1.41221 12.5299C1.02875 11.3781 0.91241 10.1542 1.07201 8.95084C1.23162 7.74748 1.66298 6.59621 2.33343 5.58425C3.00387 4.57229 3.89581 3.72617 4.9417 3.10998C5.98758 2.4938 7.15998 2.1237 8.37008 2.02773C9.58018 1.93176 10.7963 2.11243 11.9262 2.55605C13.0561 2.99968 14.0703 3.69462 14.8919 4.58825C15.5423 5.29573 16.0585 6.11304 16.4177 7.00002H17.4999C18.6799 6.99991 19.8288 7.37933 20.7766 8.08222C21.7245 8.78515 22.4212 9.7743 22.7637 10.9036C23.1062 12.0328 23.0765 13.2423 22.6788 14.3534C22.2812 15.4644 21.5367 16.4181 20.5554 17.0736C20.0962 17.3803 19.4752 17.2567 19.1684 16.7975C18.8617 16.3382 18.9853 15.7172 19.4445 15.4105C20.069 14.9934 20.5427 14.3865 20.7958 13.6794C21.0488 12.9724 21.0678 12.2027 20.8498 11.4841C20.6318 10.7655 20.1885 10.136 19.5853 9.6887C18.9821 9.24138 18.251 8.99993 17.5001 9.00002H15.71C15.2679 9.00002 14.8783 8.70973 14.7518 8.28611C14.4913 7.41374 14.0357 6.61208 13.4195 5.94186C12.8034 5.27164 12.0427 4.75043 11.1953 4.41771Z"
			fill="currentColor"
		/>
		<path
			d="M11 14.4142V21C11 21.5523 11.4477 22 12 22C12.5523 22 13 21.5523 13 21V14.4142L15.2929 16.7071C15.6834 17.0976 16.3166 17.0976 16.7071 16.7071C17.0976 16.3166 17.0976 15.6834 16.7071 15.2929L12.7078 11.2936C12.7054 11.2912 12.703 11.2888 12.7005 11.2864C12.5208 11.1099 12.2746 11.0008 12.003 11L12 11L11.997 11C11.8625 11.0004 11.7343 11.0273 11.6172 11.0759C11.502 11.1236 11.3938 11.1937 11.2995 11.2864C11.297 11.2888 11.2946 11.2912 11.2922 11.2936L7.29289 15.2929C6.90237 15.6834 6.90237 16.3166 7.29289 16.7071C7.68342 17.0976 8.31658 17.0976 8.70711 16.7071L11 14.4142Z"
			fill="currentColor"
		/>
	</svg>
);

const FileIcon: React.FC = () => (
	<svg
		className="tiptap-image-upload-dropzone-rect-primary"
		fill="currentColor"
		height="57"
		viewBox="0 0 43 57"
		width="43"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>Image upload dropzone</title>
		<path
			d="M0.75 10.75C0.75 5.64137 4.89137 1.5 10 1.5H32.3431C33.2051 1.5 34.0317 1.84241 34.6412 2.4519L40.2981 8.10876C40.9076 8.71825 41.25 9.5449 41.25 10.4069V46.75C41.25 51.8586 37.1086 56 32 56H10C4.89137 56 0.75 51.8586 0.75 46.75V10.75Z"
			fill="currentColor"
			fillOpacity="0.11"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
	</svg>
);

const FileCornerIcon: React.FC = () => (
	<svg
		className="tiptap-image-upload-dropzone-rect-secondary"
		fill="currentColor"
		height="10"
		viewBox="0 0 10 10"
		width="10"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>Image uplaod dropzone secondary</title>
		<path
			d="M0 0.75H0.343146C1.40401 0.75 2.42143 1.17143 3.17157 1.92157L8.82843 7.57843C9.57857 8.32857 10 9.34599 10 10.4069V10.75H4C1.79086 10.75 0 8.95914 0 6.75V0.75Z"
			fill="currentColor"
		/>
	</svg>
);

interface ImageUploadDragAreaProps {
	children?: React.ReactNode;
	onFile: (files: File[]) => void;
}

const ImageUploadDragArea: React.FC<ImageUploadDragAreaProps> = ({ children, onFile }) => {
	const [dragover, setDragover] = React.useState(false);

	const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
		setDragover(false);
		e.preventDefault();
		e.stopPropagation();

		const files = [...e.dataTransfer.files];
		onFile(files);
	};

	const onDragover = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setDragover(true);
	};

	const onDragleave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setDragover(false);
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: tiptap source code, check this
		<div
			className={`tiptap-image-upload-dragger ${dragover ? "tiptap-image-upload-dragger-active" : ""}`}
			onDragLeave={onDragleave}
			onDragOver={onDragover}
			onDrop={onDrop}
		>
			{children}
		</div>
	);
};

interface ImageUploadPreviewProps {
	file: File;
	onRemove: () => void;
	progress: number;
	status: "error" | "success" | "uploading";
}

const ImageUploadPreview: React.FC<ImageUploadPreviewProps> = ({ file, onRemove, progress, status }) => {
	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	return (
		<div className="tiptap-image-upload-preview">
			{status === "uploading" && (
				<div className="tiptap-image-upload-progress" style={{ width: `${progress}%` }} />
			)}

			<div className="tiptap-image-upload-preview-content">
				<div className="tiptap-image-upload-file-info">
					<div className="tiptap-image-upload-file-icon">
						<CloudUploadIcon />
					</div>
					<div className="tiptap-image-upload-details">
						<span className="tiptap-image-upload-text">{file.name}</span>
						<span className="tiptap-image-upload-subtext">{formatFileSize(file.size)}</span>
					</div>
				</div>
				<div className="tiptap-image-upload-actions">
					{status === "uploading" && <span className="tiptap-image-upload-progress-text">{progress}%</span>}
					<button
						className="tiptap-image-upload-close-btn"
						onClick={(e) => {
							e.stopPropagation();
							onRemove();
						}}
						type="button"
					>
						<CloseIcon />
					</button>
				</div>
			</div>
		</div>
	);
};

const DropZoneContent: React.FC<{ maxSize: number }> = ({ maxSize }) => (
	<>
		<div className="tiptap-image-upload-dropzone">
			<FileIcon />
			<FileCornerIcon />
			<div className="tiptap-image-upload-icon-container">
				<CloudUploadIcon />
			</div>
		</div>

		<div className="tiptap-image-upload-content">
			<span className="tiptap-image-upload-text">
				<em>Click to upload</em> or drag and drop
			</span>
			<span className="tiptap-image-upload-subtext">Maximum file size {maxSize / 1024 / 1024}MB.</span>
		</div>
	</>
);

export const ImageUploadNode: React.FC<NodeViewProps> = (props) => {
	const { accept, limit, maxSize } = props.node.attrs;
	const inputRef = React.useRef<HTMLInputElement>(null);
	const { extension } = props;

	const uploadOptions: UploadOptions = {
		accept,
		limit,
		maxSize,
		onError: extension.options.onError,
		onSuccess: extension.options.onSuccess,
		upload: extension.options.upload,
	};

	const { clearFileItem, fileItem, uploadFiles } = useFileUpload(uploadOptions);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { files } = e.target;
		if (!files || files.length === 0) {
			extension.options.onError?.(new Error("No file selected"));
			return;
		}
		handleUpload([...files]);
	};

	const handleUpload = async (files: File[]) => {
		const url = await uploadFiles(files);

		if (url) {
			const pos = props.getPos();
			const filename = files[0]?.name.replace(/\.[^/.]+$/, "") || "unknown";

			props.editor
				.chain()
				.focus()
				.deleteRange({ from: pos, to: pos + 1 })
				.insertContentAt(pos, [
					{
						attrs: { alt: filename, src: url, title: filename },
						type: "image",
					},
				])
				.run();
		}
	};

	const handleClick = () => {
		if (inputRef.current && !fileItem) {
			inputRef.current.value = "";
			inputRef.current.click();
		}
	};

	return (
		<NodeViewWrapper className="tiptap-image-upload" onClick={handleClick} tabIndex={0}>
			{!fileItem && (
				<ImageUploadDragArea onFile={handleUpload}>
					<DropZoneContent maxSize={maxSize} />
				</ImageUploadDragArea>
			)}

			{fileItem && (
				<ImageUploadPreview
					file={fileItem.file}
					onRemove={clearFileItem}
					progress={fileItem.progress}
					status={fileItem.status}
				/>
			)}

			<input
				accept={accept}
				name="file"
				onChange={handleChange}
				onClick={(e: React.MouseEvent<HTMLInputElement>) => {
					e.stopPropagation();
				}}
				ref={inputRef}
				type="file"
			/>
		</NodeViewWrapper>
	);
};
