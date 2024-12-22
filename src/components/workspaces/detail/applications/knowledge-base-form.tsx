import { FileUploader } from "@/components/file-uploader";
import { FilesDisplay } from "@/components/files-display";
import { GrantApplicationFormValues } from "@/components/workspaces/detail/applications/schema";
import { FormControl, FormField, FormItem } from "gen/ui/form";
import { useCallback } from "react";
import { UseFormReturn } from "react-hook-form";

export function KnowledgeBaseForm({ form }: { form: UseFormReturn<GrantApplicationFormValues> }) {
	const handleFileChange = useCallback(
		(newFiles: File[]) => {
			const fileNames = new Set(newFiles.map((file) => file.name));
			form.setValue("application_files", [
				...form.getValues("application_files").filter((file) => !fileNames.has(file.name)),
				...newFiles,
			]);
		},
		[form],
	);

	return (
		<div className="space-y-4">
			<h2 className="text-xl font-semibold mb-4">Knowledge Base</h2>
			<p className="text-sm px-3 space-y-6 italic">
				Upload sources for application generation: previous applications, research notes, articles,
				presentations etc.
			</p>
			<FormField
				control={form.control}
				name="application_files"
				render={({ field }) => (
					<FormItem>
						<FormControl>
							<FileUploader
								currentFileCount={field.value.length}
								data-testid="files-input"
								fieldName={field.name}
								isDropZone={true}
								onFilesAdded={handleFileChange}
							/>
						</FormControl>
						<FilesDisplay
							files={field.value}
							onFileRemoved={(file) => {
								field.onChange(field.value.filter((f) => f !== file));
							}}
						/>
					</FormItem>
				)}
			/>
		</div>
	);
}
