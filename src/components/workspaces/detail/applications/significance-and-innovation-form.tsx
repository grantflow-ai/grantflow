import { HelpCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "gen/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Textarea } from "gen/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "gen/ui/tooltip";
import { useShallow } from "zustand/react/shallow";
import { useWizardStore } from "@/stores/wizard";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "gen/cn";
import { FileUploader } from "@/components/file-uploader";
import { FileAttributes, FilesDisplay } from "@/components/files-display";
import { uploadFiles } from "@/actions/file";

const formSchema = z.object({
	files: z.array(z.custom<FileAttributes>()),
	significanceDescription: z.string().optional(),
	innovationDescription: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function SignificanceAndInnovationForm({
	applicationId,
	onPressNext,
	onPressPrevious,
	workspaceId,
}: {
	applicationId: string;
	onPressNext: () => void;
	onPressPrevious: () => void;
	workspaceId: string;
}) {
	const [canSubmit, setCanSubmit] = useState(false);

	const {
		applicationFiles,
		innovation,
		loading,
		significance,
		updateFiles,
		updateResearchInnovation,
		updateResearchSignificance,
	} = useWizardStore({
		workspaceId,
	})(
		useShallow((state) => ({
			applicationFiles: state.files,
			innovation: state.innovation,
			loading: state.loading,
			significance: state.significance,
			updateFiles: state.updateFiles,
			updateResearchInnovation: state.updateResearchInnovation,
			updateResearchSignificance: state.updateResearchSignificance,
		})),
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			files: applicationFiles
				.filter((file) => file.section === "significance-and-innovation")
				.map(({ name, size, type }) => ({
					name,
					size,
					type,
				})),
			significanceDescription: significance?.text ?? "",
			innovationDescription: innovation?.text ?? "",
		},
	});
	form.watch((values) => {
		const significanceText = values.significanceDescription?.trim() ?? "";
		const innovationText = values.innovationDescription?.trim() ?? "";
		const files = values.files ?? [];

		const hasRequiredData = (significanceText.length > 0 && innovationText.length > 0) || files.length > 0;

		if (!hasRequiredData) {
			setCanSubmit(false);
			return;
		}

		const sectionFiles = applicationFiles.filter((file) => file.section === "significance-and-innovation");
		const hasDifferentText = significanceText !== significance?.text || innovationText !== innovation?.text;
		const hasDifferentFiles =
			files.length !== sectionFiles.length ||
			files.some(
				(file) =>
					file &&
					!sectionFiles.some((f) => f.name === file.name && f.size === file.size && f.type === file.type),
			);

		setCanSubmit(hasDifferentText || hasDifferentFiles);
	});

	const onSubmit = async (values: FormValues) => {
		const promises: Promise<unknown>[] = [
			updateResearchSignificance({
				...significance,
				text: values.significanceDescription?.trim() ?? "",
				applicationId,
			}),
			updateResearchInnovation({
				...innovation,
				text: values.innovationDescription?.trim() ?? "",
				applicationId,
			}),
		];

		const filesToUpload = values.files.filter((file) => file instanceof File);
		if (filesToUpload.length) {
			const uploadedFilesData = await uploadFiles({
				applicationId,
				workspaceId,
				sectionName: "significance-and-innovation",
				files: filesToUpload,
			});
			promises.push(updateFiles(uploadedFilesData));
		}

		await Promise.all(promises);

		setCanSubmit(false);
		onPressNext();
	};

	return (
		<TooltipProvider>
			<Form {...form}>
				<form
					className="space-y-6"
					data-testid="significance-innovation-form"
					aria-label="Research Significance and Innovation Form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FormField
						control={form.control}
						name="files"
						render={({ field }) => (
							<FormItem>
								<FilesDisplay
									files={field.value}
									onFileRemoved={(file) => {
										field.onChange(field.value.filter((f) => f !== file));
									}}
								/>
								<FormControl>
									<FileUploader
										currentFileCount={field.value.length}
										onFilesAdded={(newFiles) => {
											field.onChange([...field.value, ...newFiles]);
										}}
										data-testid="significance-and-innovation-files-input"
										fieldName={field.name}
										isDropZone={true}
									/>
								</FormControl>
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="significanceDescription"
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center gap-2">
									<FormLabel
										htmlFor="significanceDescription"
										className="text-xl"
										data-testid="significance-innovation-form-significance-label"
									>
										Research Significance
									</FormLabel>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												className="p-0 h-4 w-4"
												data-testid="significance-innovation-form-significance-help"
												aria-label="Research significance information"
											>
												<HelpCircle className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent
											data-testid="significance-innovation-form-significance-tooltip"
											role="tooltip"
										>
											Explain the importance of the problem or critical barrier that your project
											addresses, and how it impacts human lives.
										</TooltipContent>
									</Tooltip>
								</div>
								<FormControl>
									<Textarea
										{...field}
										ref={(textarea) => {
											if (textarea) {
												textarea.style.height = "0px";
												textarea.style.height = `${textarea.scrollHeight}px`;
											}
										}}
										id="significance.text"
										disabled={loading}
										placeholder="Describe the significance of your research"
										className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary"
										data-testid="significance-innovation-form-significance-input"
										aria-required="true"
										aria-invalid={!!form.formState.errors.significanceDescription}
										aria-describedby={
											form.formState.errors.significanceDescription
												? "significance-error significance-counter"
												: "significance-counter"
										}
									/>
								</FormControl>
								{field.value && (
									<p
										id="significance-counter"
										data-testid="significance-innovation-form-significance-char-count"
										aria-live="polite"
										className={cn(
											"text-xs text-muted-foreground transition-colors duration-200",
											"text-green-500",
										)}
									>
										{field.value.length} characters
									</p>
								)}
								{form.formState.errors.significanceDescription?.message && (
									<FormMessage
										id="significance-error"
										data-testid="significance-innovation-form-significance-error"
										className="text-destructive"
										role="alert"
									>
										{form.formState.errors.significanceDescription.message}
									</FormMessage>
								)}
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="innovationDescription"
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center gap-2">
									<FormLabel
										htmlFor="innovationDescription"
										className="text-xl"
										data-testid="significance-innovation-form-innovation-label"
									>
										Research Innovation
									</FormLabel>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												className="p-0 h-4 w-4"
												data-testid="significance-innovation-form-innovation-help"
												aria-label="Research innovation information"
											>
												<HelpCircle className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent
											data-testid="significance-innovation-form-innovation-tooltip"
											role="tooltip"
										>
											Describe the novel aspects of your project and how it challenges or shifts
											current research or clinical practice paradigms.
										</TooltipContent>
									</Tooltip>
								</div>
								<FormControl>
									<Textarea
										{...field}
										ref={(textarea) => {
											if (textarea) {
												textarea.style.height = "0px";
												textarea.style.height = `${textarea.scrollHeight}px`;
											}
										}}
										id="innovation.text"
										disabled={loading}
										placeholder="Describe the innovation of your research"
										className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary"
										data-testid="significance-innovation-form-innovation-input"
										aria-required="true"
										aria-invalid={!!form.formState.errors.innovationDescription}
										aria-describedby={
											form.formState.errors.innovationDescription
												? "innovation-error innovation-counter"
												: "innovation-counter"
										}
									/>
								</FormControl>
								{field.value && (
									<p
										id="innovation-counter"
										data-testid="significance-innovation-form-innovation-char-count"
										aria-live="polite"
										className={cn(
											"text-xs text-muted-foreground transition-colors duration-200",
											"text-green-500",
										)}
									>
										{field.value.length} characters
									</p>
								)}
								{form.formState.errors.innovationDescription?.message && (
									<FormMessage
										id="innovation-error"
										data-testid="significance-innovation-form-innovation-error"
										className="text-destructive"
										role="alert"
									>
										{form.formState.errors.innovationDescription.message}
									</FormMessage>
								)}
							</FormItem>
						)}
					/>

					<div className="pt-10 flex justify-between">
						<Button onClick={onPressPrevious} aria-label="Go Back">
							Go Back
						</Button>
						{significance && innovation && !canSubmit ? (
							<Button
								onClick={onPressNext}
								data-testid="significance-innovation-form-continue-button"
								aria-label="Continue to the next step"
							>
								Continue
							</Button>
						) : (
							<SubmitButton
								disabled={!form.formState.isValid || !canSubmit}
								isLoading={loading}
								data-testid="significance-innovation-form-submit"
								aria-disabled={!form.formState.isValid || form.formState.isSubmitting}
								aria-label={form.formState.isSubmitting ? "Saving changes..." : "Save changes"}
							>
								Save and Continue
							</SubmitButton>
						)}
					</div>
				</form>
			</Form>
		</TooltipProvider>
	);
}
