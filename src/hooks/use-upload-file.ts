/**
 * A hook to upload a file to the server.
 */
export function useUploadFile(): {
	isUploading: boolean;
	progress: number;
	uploadedFile: ({ url?: string } & File) | null;
	uploadFile: (file: { url?: string } & File) => Promise<void>;
	uploadingFile?: ({ url?: string } & File) | null;
} {
	return {
		isUploading: false,
		progress: 0,
		uploadedFile: null,
		// eslint-disable-next-line @typescript-eslint/require-await,no-unused-vars
		uploadFile: async (_: { url?: string } & File) => {
			return;
		},
	};
}
