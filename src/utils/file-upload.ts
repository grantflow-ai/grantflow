import type { FileData } from "@/types";
import { generateUploadUrls } from "@/actions/file";
import { zip } from "remeda";
import axios from "axios";
import { toast } from "sonner";

/**
 *
 */
export async function handleFileUpload(files: FileData[], setProgresses: (progresses: Record<string, number>) => void) {
	const target = files.length > 1 ? `${files.length} files` : "file";
	try {
		const progresses: Record<string, number> = Object.fromEntries(files.map((file) => [file.name, 0]));
		const uploadUrls = await generateUploadUrls(files);

		const promises = zip(files, uploadUrls).map(async ([file, uploadUrl]) => {
			if (!uploadUrl) {
				throw new Error(`No upload URL found for file: ${file.name}`);
			}

			await axios.put(uploadUrl, file, {
				headers: {
					"Content-Type": file.type,
					"x-ms-blob-type": "BlockBlob",
				},
				onUploadProgress: (progressEvent) => {
					const newProgresses = { ...progresses, [file.name]: 0 };
					if (progressEvent.loaded && progressEvent.total) {
						newProgresses[file.name] = Math.round((progressEvent.loaded * 100) / progressEvent.total);
					}
					setProgresses(newProgresses);
				},
			});
		});
		await Promise.all(promises);
	} catch {
		toast.error(`Failed to upload ${target}`);
	}
}
