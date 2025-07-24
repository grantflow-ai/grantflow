import * as React from "react";
import type { NodeViewProps } from "@tiptap/react";
import "@/components/tiptap-node/image-upload-node/image-upload-node.scss";
export interface FileItem {
    /**
     * Unique identifier for the file item
     */
    id: string;
    /**
     * The actual File object being uploaded
     */
    file: File;
    /**
     * Current upload progress as a percentage (0-100)
     */
    progress: number;
    /**
     * Current status of the file upload process
     * @default "uploading"
     */
    status: "uploading" | "success" | "error";
    /**
     * URL to the uploaded file, available after successful upload
     * @optional
     */
    url?: string;
    /**
     * Controller that can be used to abort the upload process
     * @optional
     */
    abortController?: AbortController;
}
export interface UploadOptions {
    /**
     * Maximum allowed file size in bytes
     */
    maxSize: number;
    /**
     * Maximum number of files that can be uploaded
     */
    limit: number;
    /**
     * String specifying acceptable file types (MIME types or extensions)
     * @example ".jpg,.png,image/jpeg" or "image/*"
     */
    accept: string;
    /**
     * Function that handles the actual file upload process
     * @param {File} file - The file to be uploaded
     * @param {Function} onProgress - Callback function to report upload progress
     * @param {AbortSignal} signal - Signal that can be used to abort the upload
     * @returns {Promise<string>} Promise resolving to the URL of the uploaded file
     */
    upload: (file: File, onProgress: (event: {
        progress: number;
    }) => void, signal: AbortSignal) => Promise<string>;
    /**
     * Callback triggered when a file is uploaded successfully
     * @param {string} url - URL of the successfully uploaded file
     * @optional
     */
    onSuccess?: (url: string) => void;
    /**
     * Callback triggered when an error occurs during upload
     * @param {Error} error - The error that occurred
     * @optional
     */
    onError?: (error: Error) => void;
}
export declare const ImageUploadNode: React.FC<NodeViewProps>;
//# sourceMappingURL=image-upload-node.d.ts.map