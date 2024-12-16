/**
 * A hook to upload a file to the server.
 */
export function useUploadFile(): {
	isUploading: boolean;
	progress: number;
	uploadFile: (file: File & { url?: string }) => Promise<void>;
	uploadedFile: (File & { url?: string }) | null;
	uploadingFile?: (File & { url?: string }) | null;
} {
	return {
		isUploading: false,
		progress: 0,
		// eslint-disable-next-line @typescript-eslint/require-await,no-unused-vars
		uploadFile: async (_: File & { url?: string }) => {
			return;
		},
		uploadedFile: null,
	};
}
