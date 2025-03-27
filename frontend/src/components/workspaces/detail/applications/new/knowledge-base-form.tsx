"use client";

import { toast } from "sonner";
import { FileUploader } from "@/components/file-uploader";
import { FilesDisplay } from "@/components/files-display";
import { UseFormReturn } from "react-hook-form";
import { NewGrantWizardFormValues } from "@/schema";

export function KnowledgeBaseForm({ form }: { form: UseFormReturn<NewGrantWizardFormValues> }) {
	const handleFilesAdded = (newFiles: File[]) => {
		const updatedFiles = [...form.getValues("files"), ...newFiles];
		form.setValue("files", updatedFiles);
		toast.success(`${newFiles.length} file(s) added`);
	};

	const handleFileRemoved = (fileToRemove: File) => {
		const updatedFiles = form.getValues("files").filter((file) => file !== fileToRemove);
		form.setValue("files", updatedFiles);
		toast.success("File removed");
	};

	return (
		<div className="space-y-4" data-testid="knowledge-base-form">
			<p className="text-sm text-muted-foreground">
				Upload sources for text generation. This may include previous versions of your grant application,
				relevant research papers, or other pertinent documents that will help in generating your proposal.
			</p>

			<FileUploader
				currentFileCount={form.getValues("files").length}
				data-testid="knowledge-base-file-uploader"
				fieldName="sources"
				isDropZone={true}
				onFilesAdded={handleFilesAdded}
			/>

			<FilesDisplay
				data-testid="knowledge-base-files-display"
				files={form.getValues("files")}
				onFileRemoved={handleFileRemoved}
			/>
		</div>
	);
}
