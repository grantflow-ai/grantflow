/**
 *
 */
export function useUploadFile(): {
	isUploading: boolean;
	progress: number;
	uploadFile: (file: File) => Promise<void>;
	uploadedFile: File | null;
	uploadingFile?: File | null;
} {
	return {
		isUploading: false,
		progress: 0,
		uploadFile: async (file: File) => {
			return;
		},
		uploadedFile: null,
	};
}
