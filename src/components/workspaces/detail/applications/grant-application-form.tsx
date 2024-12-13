"use client";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "gen/ui/tooltip";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Button } from "gen/ui/button";
import { Check, ChevronsUpDown, HelpCircle, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "gen/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "gen/ui/command";
import { cn } from "gen/cn";
import { Input } from "gen/ui/input";
import { Textarea } from "gen/ui/textarea";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateGrantApplicationRequestBody, GrantApplicationDetail, GrantCfp, ResearchAim } from "@/types/api-types";
import { OmitId } from "@/types/app-types";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { useRouter } from "next/navigation";
import { PagePath } from "@/enums";
import { createApplication, createResearchAims, uploadApplicationFiles } from "@/app/actions/api";
import { logError } from "@/utils/logging";
import {
	grantApplicationFormSchema,
	GrantApplicationFormValues,
} from "@/components/workspaces/detail/applications/schema";
import { ResearchAimForm } from "@/components/workspaces/detail/applications/research-tasks-form";
import { KnowledgeBaseForm } from "@/components/workspaces/detail/applications/knowledge-base-form";

async function handleCreateApplication({
	workspaceId,
	formData,
}: {
	workspaceId: string;
	formData: GrantApplicationFormValues;
}) {
	const { id } = await createApplication(workspaceId, {
		title: formData.title,
		cfp_id: formData.cfp_id,
		significance: formData.significance,
		innovation: formData.innovation,
	} satisfies CreateGrantApplicationRequestBody);

	await createResearchAims(workspaceId, id, formData.research_aims as OmitId<ResearchAim>[]);

	if (formData.application_files.length) {
		await uploadApplicationFiles(workspaceId, id, formData.application_files as File[]);
	}

	return id;
}

export function GrantApplicationForm({
	cfps,
	workspaceId,
}: {
	cfps: GrantCfp[];
	application?: GrantApplicationDetail;
	workspaceId: string;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [title, setTitle] = useState("Select an NIH Activity Code");

	const onSubmit = async (values: GrantApplicationFormValues) => {
		setLoading(true);
		try {
			const applicationId = await handleCreateApplication({
				workspaceId,
				formData: values,
			});
			router.push(
				PagePath.APPLICATION_DETAIL.replace(":workspaceId", workspaceId).replace(
					":applicationId",
					applicationId,
				),
			);
		} catch (error) {
			logError({ error, identifier: "handleCreateApplication" });
			toast.error("An error occurred creating the grant application.");
		} finally {
			setLoading(false);
		}
	};

	const form = useForm<GrantApplicationFormValues>({
		resolver: zodResolver(grantApplicationFormSchema),
		defaultValues: {
			application_files: [],
			cfp_id: "",
			title: "",
			research_aims: [],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "research_aims",
	});

	const setCfpTitle = (cfpId: string) => {
		const cfp = cfps.find((cfp) => cfp.id === cfpId);
		setTitle(cfp ? `${cfp.code} - ${cfp.title}` : "Select an NIH Activity Code");
	};

	form.watch(({ cfp_id }) => {
		if (cfp_id) {
			setCfpTitle(cfp_id);
		} else {
			setTitle("Select an NIH Activity Code");
		}
	});

	return (
		<TooltipProvider>
			<Form {...form}>
				<form
					className="w-full max-w-7xl mx-auto"
					data-testid="grant-application-form"
					aria-label="Grant Application Form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<h1 className="text-3xl font-bold mb-8">Grant Application</h1>
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						<div className="lg:col-span-2 space-y-8">
							<section className="space-y-6">
								<h2 className="text-xl font-semibold mb-4">Grant Details</h2>
								<FormField
									control={form.control}
									name="cfp_id"
									render={({ field }) => (
										<FormItem className="space-y-2">
											<div className="flex items-center gap-2">
												<FormLabel
													htmlFor="cfp_id"
													data-testid="grant-application-form-cfp-label"
												>
													NIH Activity Code <span className="text-red-300 p-0">*</span>
												</FormLabel>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															type="button"
															variant="ghost"
															className="p-0 h-4 w-4"
															data-testid="grant-application-form-cfp-help"
															aria-label="NIH Activity Code information"
														>
															<HelpCircle className="h-4 w-4" />
														</Button>
													</TooltipTrigger>
													<TooltipContent
														data-testid="grant-application-form-cfp-tooltip"
														role="tooltip"
													>
														Select the appropriate NIH Activity Code for your grant
														application
													</TooltipContent>
												</Tooltip>
											</div>
											<FormControl>
												<Popover open={open} onOpenChange={setOpen}>
													<PopoverTrigger asChild>
														<Button
															id="cfp_id"
															variant="outline"
															role="combobox"
															aria-expanded={open}
															aria-haspopup="listbox"
															aria-controls="cfp-options"
															aria-label="Select NIH Activity Code"
															className="w-full justify-between"
															type="button"
															data-testid="grant-application-form-cfp-select"
														>
															{title}
															<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
														</Button>
													</PopoverTrigger>
													<PopoverContent className="w-full max-w-md p-0">
														<Command>
															<CommandInput
																disabled={loading}
																placeholder="Search NIH Activity Codes..."
																data-testid="grant-application-form-cfp-search"
																aria-label="Search NIH Activity Codes"
															/>
															<CommandEmpty
																data-testid="grant-application-form-cfp-empty"
																role="status"
															>
																No activity code found.
															</CommandEmpty>
															<CommandGroup className="max-h-60 overflow-y-auto">
																<CommandList id="cfp-options" role="listbox">
																	{cfps.map((cfp) => (
																		<CommandItem
																			key={cfp.id}
																			value={cfp.id}
																			onSelect={(currentValue) => {
																				field.onChange(currentValue);
																				setOpen(false);
																			}}
																			role="option"
																			aria-selected={field.value === cfp.id}
																			data-testid={`grant-application-form-cfp-option-${cfp.code}`}
																		>
																			<Check
																				className={cn(
																					"mr-2 h-4 w-4",
																					field.value === cfp.id
																						? "opacity-100"
																						: "opacity-0",
																				)}
																				aria-hidden="true"
																			/>
																			<span className="font-medium">
																				{cfp.code}
																			</span>
																			<span className="ml-2 text-sm text-muted-foreground truncate">
																				{cfp.title}
																			</span>
																		</CommandItem>
																	))}
																</CommandList>
															</CommandGroup>
														</Command>
													</PopoverContent>
												</Popover>
											</FormControl>
											{form.formState.errors.cfp_id?.message && (
												<FormMessage
													data-testid="grant-application-form-cfp-error"
													className="text-destructive"
													role="alert"
												>
													{form.formState.errors.cfp_id.message}
												</FormMessage>
											)}
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="title"
									render={({ field }) => (
										<FormItem className="space-y-2">
											<div className="flex items-center gap-2">
												<FormLabel
													htmlFor="title"
													data-testid="grant-application-form-title-label"
												>
													Grant Application Title <span className="text-red-300 p-0">*</span>
												</FormLabel>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															type="button"
															variant="ghost"
															className="p-0 h-4 w-4"
															data-testid="grant-application-form-title-help"
															aria-label="Grant title information"
														>
															<HelpCircle className="h-4 w-4" />
														</Button>
													</TooltipTrigger>
													<TooltipContent
														data-testid="grant-application-form-title-tooltip"
														role="tooltip"
													>
														Enter a descriptive title for your grant application
													</TooltipContent>
												</Tooltip>
											</div>
											<FormControl>
												<Input
													{...field}
													id="title"
													disabled={loading}
													placeholder="Enter the Grant Application Title"
													className="transition-all duration-200 focus:ring-2 focus:ring-primary"
													data-testid="grant-application-form-title-input"
													aria-required="true"
													aria-invalid={!!form.formState.errors.title}
												/>
											</FormControl>
											{field.value && (
												<p
													id="title-counter"
													className={cn(
														"text-xs text-muted-foreground transition-colors duration-200",
														field.value.length < 10 && "text-red-500",
														field.value.length >= 10 &&
															field.value.length <= 255 &&
															"text-green-500",
													)}
													data-testid="grant-application-form-title-char-count"
													aria-live="polite"
												>
													{field.value.length}/255 characters
													{field.value.length < 10
														? ` (${10 - field.value.length} more required)`
														: ""}
												</p>
											)}
											{form.formState.errors.title?.message && (
												<FormMessage
													id="title-error"
													data-testid="grant-application-form-title-error"
													className="text-destructive"
													role="alert"
												>
													{form.formState.errors.title.message}
												</FormMessage>
											)}
										</FormItem>
									)}
								/>
							</section>
							<section className="space-y-6">
								<h2 className="text-xl font-semibold mb-4">Research Overview</h2>
								<FormField
									control={form.control}
									name="significance"
									render={({ field }) => (
										<FormItem className="space-y-2">
											<div className="flex items-center gap-2">
												<FormLabel
													htmlFor="significance"
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
														Explain the importance of the problem or critical barrier that
														your project addresses, and how it impacts human lives.
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
									name="innovation"
									render={({ field }) => (
										<FormItem className="space-y-2">
											<div className="flex items-center gap-2">
												<FormLabel
													htmlFor="innovation"
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
														Describe the novel aspects of your project and how it challenges
														or shifts current research or clinical practice paradigms.
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
							</section>
							<section className="space-y-6">
								<h2 className="text-xl font-semibold mb-4">Research Aims</h2>

								<div>
									{fields.map((field, index) => (
										<ResearchAimForm
											key={index.toString() + field.id}
											form={form}
											index={index}
											onClickRemove={() => {
												remove(index);
											}}
											loading={loading}
										/>
									))}
								</div>
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										append({
											title: "",
											aim_number: form.getValues().research_aims.length + 1,
											description: "",
											requires_clinical_trials: false,
											research_tasks: [
												{
													title: "",
													description: "",
													task_number: 1,
												},
											],
										});
									}}
									className="w-full"
									data-testid="add-research-aim-button"
								>
									<Plus className="h-4 w-4 mr-2" />
									Add Research Aim
								</Button>
							</section>
						</div>
						<div className="lg:col-span-1">
							<div className="sticky top-4">
								<KnowledgeBaseForm form={form} />
							</div>
						</div>
					</div>
					<div className="mt-8 pt-6 border-t flex justify-end">
						<SubmitButton
							disabled={!form.formState.isValid || loading}
							isLoading={loading}
							data-testid="grant-application-form-submit"
							aria-disabled={!form.formState.isValid || form.formState.isSubmitting}
							aria-label={form.formState.isSubmitting ? "Saving changes..." : "Save changes"}
							className="w-full sm:w-auto"
						>
							Save and Continue
						</SubmitButton>
					</div>
				</form>
			</Form>
		</TooltipProvider>
	);
}
