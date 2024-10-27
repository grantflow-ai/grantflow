import { HelpCircle } from "lucide-react";
import { useForm, UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { cn } from "gen/cn";
import { Button } from "gen/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";
import { Checkbox } from "gen/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "gen/ui/tooltip";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitButton } from "@/components/submit-button";
import { useWizardStore } from "@/stores/wizard";
import { useShallow } from "zustand/react/shallow";
import { ResearchAim } from "@/types/database-types";
import { Textarea } from "gen/ui/textarea";
import { FileUploadContainer } from "@/components/file-upload-container";
import { useState } from "react";

const researchTaskSchema = z.object({
	title: z.string().min(5, "Title must be at least 5 characters").max(255, "Title must not exceed 255 characters"),
	description: z.string().min(20, "Description must be at least 20 characters"),
	files: z.record(z.string()).optional(),
});

const researchAimSchema = z.object({
	title: z.string().min(5, "Title must be at least 5 characters").max(255, "Title must not exceed 255 characters"),
	description: z.string().min(20, "Description must be at least 20 characters"),
	requiresClinicalTrials: z.boolean().optional(),
	files: z.record(z.string()).optional(),
	tasks: z.array(researchTaskSchema).min(1),
});

type ResearchAimFormValues = z.infer<typeof researchAimSchema>;

function ResearchTaskForm({ form, loading }: { form: UseFormReturn<ResearchAimFormValues>; loading: boolean }) {
	return (
		<>
			<FormField
				control={form.control}
				name="title"
				render={({ field }) => (
					<FormItem>
						<div className="flex items-center gap-2">
							<FormLabel
								htmlFor="title"
								className="flex items-center gap-2"
								data-testid="research-task-form-title-label"
							>
								Research Aim Title
							</FormLabel>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										className="p-0 h-4 w-4"
										data-testid="research-task-form-title-help"
										aria-label="Grant title information"
									>
										<HelpCircle className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent data-testid="research-task-form-title-tooltip" role="tooltip">
									Enter the title of the research task.
								</TooltipContent>
							</Tooltip>
						</div>
						<FormControl>
							<Input
								{...field}
								id="title"
								disabled={loading}
								placeholder="Enter the Research Aim Title"
								className="transition-all duration-200 focus:ring-2 focus:ring-primary"
								data-testid="research-task-form-title-input"
								aria-required="true"
								aria-invalid={!!form.formState.errors.title}
								aria-describedby={
									form.formState.errors.title ? "title-error title-counter" : "title-counter"
								}
							/>
						</FormControl>
						{field.value && (
							<p
								id="title-counter"
								className={cn(
									"text-xs text-muted-foreground transition-colors duration-200",
									field.value.length < 5 && "text-red-500",
									field.value.length >= 5 && field.value.length <= 255 && "text-green-500",
								)}
								data-testid="research-task-form-title-char-count"
								aria-live="polite"
							>
								{field.value.length}/255 characters
								{field.value.length < 5 ? ` (${5 - field.value.length} more required)` : ""}
							</p>
						)}
						{form.formState.errors.title?.message && (
							<FormMessage
								id="title-error"
								data-testid="research-task-form-title-error"
								className="text-destructive"
								role="alert"
							>
								{form.formState.errors.title.message}
							</FormMessage>
						)}
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="description"
				render={({ field }) => (
					<FormItem>
						<div className="flex items-center gap-2">
							<FormLabel
								htmlFor="title"
								className="flex items-center gap-2"
								data-testid="research-aim-form-description-label"
							>
								Research Aim Description
							</FormLabel>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										className="p-0 h-4 w-4"
										data-testid="research-aim-form-description-help"
										aria-label="Research Aim Description information"
									>
										<HelpCircle className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent data-testid="research-aim-form-description-tooltip" role="tooltip">
									Enter a description for your research aim
								</TooltipContent>
							</Tooltip>
						</div>
						<FormControl>
							<Textarea
								{...field}
								id="description"
								disabled={loading}
								placeholder="Enter the Research Aim Description"
								className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary"
								data-testid="research-aim-form-description-input"
								aria-required="true"
								aria-invalid={!!form.formState.errors.description}
								aria-describedby={
									form.formState.errors.description
										? "description-error description-counter"
										: "description-counter"
								}
							/>
						</FormControl>
						{field.value && (
							<p
								id="title-counter"
								className={cn(
									"text-xs text-muted-foreground transition-colors duration-200",
									field.value.length < 20 && "text-red-500",
									field.value.length >= 20 && "text-green-500",
								)}
								data-testid="research-aim-form-description-char-count"
								aria-live="polite"
							>
								{field.value.length}
								{field.value.length < 20 ? ` (${20 - field.value.length} more required)` : ""}
							</p>
						)}
						{form.formState.errors.description?.message && (
							<FormMessage
								id="title-error"
								data-testid="research-aim-form-description-error"
								className="text-destructive"
								role="alert"
							>
								{form.formState.errors.description.message}
							</FormMessage>
						)}
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="requiresClinicalTrials"
				render={({ field }) => (
					<FormItem className="flex flex-row items-center space-x-2">
						<FormControl>
							<Checkbox
								id="requiresClinicalTrials"
								disabled={loading}
								checked={field.value}
								onCheckedChange={field.onChange}
								className="h-5 w-5 transition-all duration-200 focus:ring-2 focus:ring-primary"
								data-testid="research-aim-form-requires-clinical-trials-checkbox"
								aria-describedby="requires-clinical-trials-label requires-clinical-trials-tooltip"
							/>
						</FormControl>
						<div className="flex items-center space-x-2">
							<FormLabel
								id="requires-clinical-trials-label"
								htmlFor="requiresClinicalTrials"
								className="text-sm font-medium cursor-pointer"
								data-testid="research-aim-form-requires-clinical-trials-label"
							>
								This is a Re-Submission
							</FormLabel>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										className="p-0 h-4 w-4"
										data-testid="research-aim-form-requires-clinical-trials-help"
										aria-label="Resubmission information"
									>
										<HelpCircle className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent
									id="requires-clinical-trials-tooltip"
									data-testid="research-aim-form-requires-clinical-trials-tooltip"
									role="tooltip"
								>
									Check this box if you are resubmitting a previously submitted grant application
								</TooltipContent>
							</Tooltip>
						</div>
						{form.formState.errors.requiresClinicalTrials?.message && (
							<FormMessage
								data-testid="research-aim-form-requires-clinical-trials-error"
								className="text-destructive"
								role="alert"
							>
								{form.formState.errors.requiresClinicalTrials.message}
							</FormMessage>
						)}
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="files"
				render={({ field }) => (
					<FormItem>
						<FormControl>
							<FileUploadContainer
								setFileData={(files) => {
									field.onChange(files);
								}}
							/>
						</FormControl>
					</FormItem>
				)}
			/>
		</>
	);
}

export function ResearchAimForm({
	workspaceId,
	applicationId,
	onPressPrevious,
	onPressNext,
	researchAim,
}: {
	workspaceId: string;
	applicationId: string;
	onPressNext: () => void;
	onPressPrevious: () => void;
	researchAim?: ResearchAim;
}) {
	const [canSubmit, setCanSubmit] = useState(false);
	const { loading } = useWizardStore({ workspaceId })(
		useShallow((state) => ({
			loading: state.loading,
		})),
	);

	const form = useForm<ResearchAimFormValues>({
		resolver: zodResolver(researchAimSchema),
		defaultValues: {
			title: researchAim?.title ?? "",
			description: researchAim?.description ?? "",
			requiresClinicalTrials: researchAim?.requiresClinicalTrials ?? false,
			files: researchAim?.files ?? {},
		},
	});

	const onSubmit = async (values: ResearchAimFormValues) => {};

	return (
		<TooltipProvider>
			<Form {...form}>
				<form
					className="space-y-6"
					data-testid="research-aim-form"
					aria-label="Research Aim Form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FormField
						control={form.control}
						name="title"
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center gap-2">
									<FormLabel
										htmlFor="title"
										className="flex items-center gap-2"
										data-testid="research-aim-form-title-label"
									>
										Research Aim Title
									</FormLabel>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												className="p-0 h-4 w-4"
												data-testid="research-aim-form-title-help"
												aria-label="Grant title information"
											>
												<HelpCircle className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent data-testid="research-aim-form-title-tooltip" role="tooltip">
											Enter the title of the research aim.
										</TooltipContent>
									</Tooltip>
								</div>
								<FormControl>
									<Input
										{...field}
										id="title"
										disabled={loading}
										placeholder="Enter the Research Aim Title"
										className="transition-all duration-200 focus:ring-2 focus:ring-primary"
										data-testid="research-aim-form-title-input"
										aria-required="true"
										aria-invalid={!!form.formState.errors.title}
										aria-describedby={
											form.formState.errors.title ? "title-error title-counter" : "title-counter"
										}
									/>
								</FormControl>
								{field.value && (
									<p
										id="title-counter"
										className={cn(
											"text-xs text-muted-foreground transition-colors duration-200",
											field.value.length < 5 && "text-red-500",
											field.value.length >= 5 && field.value.length <= 255 && "text-green-500",
										)}
										data-testid="research-aim-form-title-char-count"
										aria-live="polite"
									>
										{field.value.length}/255 characters
										{field.value.length < 5 ? ` (${5 - field.value.length} more required)` : ""}
									</p>
								)}
								{form.formState.errors.title?.message && (
									<FormMessage
										id="title-error"
										data-testid="research-aim-form-title-error"
										className="text-destructive"
										role="alert"
									>
										{form.formState.errors.title.message}
									</FormMessage>
								)}
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center gap-2">
									<FormLabel
										htmlFor="title"
										className="flex items-center gap-2"
										data-testid="research-aim-form-description-label"
									>
										Research Aim Description
									</FormLabel>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												className="p-0 h-4 w-4"
												data-testid="research-aim-form-description-help"
												aria-label="Research Aim Description information"
											>
												<HelpCircle className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent
											data-testid="research-aim-form-description-tooltip"
											role="tooltip"
										>
											Enter a description for your research aim
										</TooltipContent>
									</Tooltip>
								</div>
								<FormControl>
									<Textarea
										{...field}
										id="description"
										disabled={loading}
										placeholder="Enter the Research Aim Description"
										className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary"
										data-testid="research-aim-form-description-input"
										aria-required="true"
										aria-invalid={!!form.formState.errors.description}
										aria-describedby={
											form.formState.errors.description
												? "description-error description-counter"
												: "description-counter"
										}
									/>
								</FormControl>
								{field.value && (
									<p
										id="title-counter"
										className={cn(
											"text-xs text-muted-foreground transition-colors duration-200",
											field.value.length < 20 && "text-red-500",
											field.value.length >= 20 && "text-green-500",
										)}
										data-testid="research-aim-form-description-char-count"
										aria-live="polite"
									>
										{field.value.length}
										{field.value.length < 20 ? ` (${20 - field.value.length} more required)` : ""}
									</p>
								)}
								{form.formState.errors.description?.message && (
									<FormMessage
										id="title-error"
										data-testid="research-aim-form-description-error"
										className="text-destructive"
										role="alert"
									>
										{form.formState.errors.description.message}
									</FormMessage>
								)}
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="requiresClinicalTrials"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center space-x-2">
								<FormControl>
									<Checkbox
										id="requiresClinicalTrials"
										disabled={loading}
										checked={field.value}
										onCheckedChange={field.onChange}
										className="h-5 w-5 transition-all duration-200 focus:ring-2 focus:ring-primary"
										data-testid="research-aim-form-requires-clinical-trials-checkbox"
										aria-describedby="requires-clinical-trials-label requires-clinical-trials-tooltip"
									/>
								</FormControl>
								<div className="flex items-center space-x-2">
									<FormLabel
										id="requires-clinical-trials-label"
										htmlFor="requiresClinicalTrials"
										className="text-sm font-medium cursor-pointer"
										data-testid="research-aim-form-requires-clinical-trials-label"
									>
										This is a Re-Submission
									</FormLabel>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												className="p-0 h-4 w-4"
												data-testid="research-aim-form-requires-clinical-trials-help"
												aria-label="Resubmission information"
											>
												<HelpCircle className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent
											id="requires-clinical-trials-tooltip"
											data-testid="research-aim-form-requires-clinical-trials-tooltip"
											role="tooltip"
										>
											Check this box if you are resubmitting a previously submitted grant
											application
										</TooltipContent>
									</Tooltip>
								</div>
								{form.formState.errors.requiresClinicalTrials?.message && (
									<FormMessage
										data-testid="research-aim-form-requires-clinical-trials-error"
										className="text-destructive"
										role="alert"
									>
										{form.formState.errors.requiresClinicalTrials.message}
									</FormMessage>
								)}
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="files"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<FileUploadContainer
										setFileData={(files) => {
											field.onChange(files);
										}}
									/>
								</FormControl>
							</FormItem>
						)}
					/>

					<div className="pt-10 flex justify-between">
						<Button onClick={onPressPrevious} aria-label="Go Back">
							Go Back
						</Button>
						{canSubmit ? (
							<SubmitButton
								disabled={!canSubmit}
								isLoading={loading}
								data-testid="research-aim-form-submit"
								aria-disabled={!form.formState.isValid || form.formState.isSubmitting}
								aria-label={form.formState.isSubmitting ? "Saving changes..." : "Save changes"}
							>
								Save and Continue
							</SubmitButton>
						) : (
							<Button
								onClick={onPressNext}
								data-testid="research-aim-continue-button"
								aria-label="Continue to the next step"
							>
								Continue
							</Button>
						)}
					</div>
				</form>
			</Form>
		</TooltipProvider>
	);
}
