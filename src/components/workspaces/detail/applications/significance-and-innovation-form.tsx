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
import { uploadFiles } from "@/actions/file";
import { FileUploader } from "@/components/file-uploader";
import { FileAttributes, FilesDisplay } from "@/components/files-display";
import { filterFiles } from "@/utils/file";

const formSchema = z.object({
	significance: z.object({
		text: z.string().optional(),
		files: z.array(z.custom<FileAttributes>()),
	}),
	innovation: z.object({
		text: z.string().optional(),
		files: z.array(z.custom<FileAttributes>()),
	}),
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

	const { significance, innovation, updateResearchInnovation, updateResearchSignificance, loading } = useWizardStore({
		workspaceId,
	})(
		useShallow((state) => ({
			significance: state.significance,
			innovation: state.innovation,
			updateResearchInnovation: state.updateResearchInnovation,
			updateResearchSignificance: state.updateResearchSignificance,
			loading: state.loading,
		})),
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			significance: { text: significance?.text ?? "", files: [] },
			innovation: { text: innovation?.text ?? "", files: [] },
		},
	});

	form.watch((values) => {
		const significanceText = values.significance?.text?.trim() ?? "";
		const innovationText = values.innovation?.text?.trim() ?? "";
		const significanceFiles = values.significance?.files ?? [];
		const innovationFiles = values.innovation?.files ?? [];

		const hasRequiredData =
			(significanceText || significanceFiles.length) && (innovationText || innovationFiles.length);

		if (!hasRequiredData) {
			setCanSubmit(false);
			return;
		}

		if (significance && innovation) {
			const textDifferent = significanceText !== significance.text || innovationText !== innovation.text;

			const existingSignificanceFiles = Object.values(significance.files ?? {});
			const existingInnovationFiles = Object.values(innovation.files ?? {});

			const filesChanged =
				significanceFiles.length !== existingSignificanceFiles.length ||
				innovationFiles.length !== existingInnovationFiles.length ||
				significanceFiles.some(
					(file) => file && !existingSignificanceFiles.some((f) => f.name === file.name),
				) ||
				innovationFiles.some((file) => file && !existingInnovationFiles.some((f) => f.name === file.name));
			setCanSubmit(textDifferent || filesChanged);
			return;
		}

		setCanSubmit(false);
	});

	const onSubmit = async (values: FormValues) => {
		const [upsertedSignificance, upsertedInnovation] = await Promise.all([
			updateResearchSignificance({
				...significance,
				text: values.significance.text?.trim() ?? "",
				applicationId,
			}),
			updateResearchInnovation({ ...innovation, text: values.innovation.text?.trim() ?? "", applicationId }),
		]);

		if (upsertedSignificance && values.significance.files.length) {
			const { filteredFiles, newFiles } = filterFiles(values.significance.files, upsertedSignificance.files);
			const fileMapping = newFiles.length
				? await uploadFiles({
						workspaceId,
						parentId: upsertedSignificance.id,
						files: newFiles,
					})
				: {};

			await updateResearchSignificance({ ...upsertedSignificance, files: { ...filteredFiles, ...fileMapping } });
		}

		if (upsertedInnovation && values.innovation.files.length) {
			const { filteredFiles, newFiles } = filterFiles(values.innovation.files, upsertedInnovation.files);
			const results = await uploadFiles({
				workspaceId,
				parentId: upsertedInnovation.id,
				files: newFiles,
			});

			await updateResearchInnovation({ ...upsertedInnovation, files: { ...filteredFiles, ...results } });
		}

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
						name="significance.text"
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center gap-2">
									<FormLabel
										htmlFor="significance.text"
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
										aria-invalid={!!form.formState.errors.significance}
										aria-describedby={
											form.formState.errors.significance
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
								{form.formState.errors.significance?.message && (
									<FormMessage
										id="significance-error"
										data-testid="significance-innovation-form-significance-error"
										className="text-destructive"
										role="alert"
									>
										{form.formState.errors.significance.message}
									</FormMessage>
								)}
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="significance.files"
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
										data-testid="significance-files-input"
										fieldName={field.name}
									/>
								</FormControl>
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="innovation.text"
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center gap-2">
									<FormLabel
										htmlFor="innovation.text"
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
										aria-invalid={!!form.formState.errors.innovation}
										aria-describedby={
											form.formState.errors.innovation
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
								{form.formState.errors.innovation?.message && (
									<FormMessage
										id="innovation-error"
										data-testid="significance-innovation-form-innovation-error"
										className="text-destructive"
										role="alert"
									>
										{form.formState.errors.innovation.message}
									</FormMessage>
								)}
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="innovation.files"
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
										data-testid="innovation-files-input"
										fieldName={field.name}
									/>
								</FormControl>
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
