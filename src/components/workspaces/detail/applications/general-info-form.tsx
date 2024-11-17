import { Check, ChevronsUpDown, HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { cn } from "gen/cn";
import { Button } from "gen/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "gen/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "gen/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";
import { Checkbox } from "gen/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "gen/ui/tooltip";
import { GrantCFP } from "@/types/database-types";
import { useWizardStore } from "@/stores/wizard";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitButton } from "@/components/submit-button";

const formSchema = z.object({
	cfpId: z.string({
		required_error: "Please select an NIH Activity Code",
	}),
	title: z.string().min(10, "Title must be at least 10 characters").max(255, "Title must not exceed 255 characters"),
	isResubmission: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function GeneralInfoForm({
	cfps,
	workspaceId,
	onPressNext,
	onPressPrevious,
}: {
	cfps: GrantCFP[];
	workspaceId: string;
	onPressNext: () => void;
	onPressPrevious: () => void;
}) {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("Select an NIH Activity Code");
	const [canSubmit, setCanSubmit] = useState(false);

	const { updateApplication, application, loading, setGrantCFP } = useWizardStore({ workspaceId })(
		useShallow((store) => ({
			loading: store.loading,
			application: store.application,
			updateApplication: store.updateApplication,
			setGrantCFP: store.setGrantCFP,
		})),
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			cfpId: application?.cfpId ?? "",
			title: application?.title ?? "",
			isResubmission: application?.isResubmission ?? false,
		},
	});

	const setCfpTitle = (cfpId: string) => {
		const cfp = cfps.find((cfp) => cfp.id === cfpId);
		setTitle(cfp ? `${cfp.code} - ${cfp.title}` : "Select an NIH Activity Code");
	};

	form.watch(({ cfpId }) => {
		if (cfpId) {
			setCfpTitle(cfpId);
			setGrantCFP(cfps.find((cfp) => cfp.id === cfpId)!);
		}
	});

	form.watch((values) => {
		if (!values.title?.trim() || !values.cfpId) {
			setCanSubmit(false);
			return;
		}

		if (!application) {
			setCanSubmit(Boolean(values.cfpId && values.title && values.title.trim().length >= 10));
			return;
		}

		setCanSubmit(
			application.cfpId !== values.cfpId ||
				application.title !== values.title ||
				application.isResubmission !== values.isResubmission,
		);
	});

	const onSubmit = async ({ title, cfpId, ...rest }: FormValues) => {
		await updateApplication(
			{ ...application, cfpId, ...rest, title: title.trim(), status: application?.status ?? "draft" },
			() => {
				setCanSubmit(false);
				setGrantCFP(cfps.find((cfp) => cfp.id === cfpId)!);
				onPressNext();
			},
		);
	};

	useEffect(() => {
		if (application) {
			setCfpTitle(application.cfpId);
		}
	}, [application]);

	return (
		<TooltipProvider>
			<Form {...form}>
				<form
					className="space-y-6"
					data-testid="grant-application-form"
					aria-label="Grant Application Form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FormField
						control={form.control}
						name="cfpId"
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center gap-2">
									<FormLabel
										htmlFor="cfpId"
										className="flex items-center gap-2"
										data-testid="grant-application-form-cfp-label"
									>
										NIH Activity Code
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
										<TooltipContent data-testid="grant-application-form-cfp-tooltip" role="tooltip">
											Select the appropriate NIH Activity Code for your grant application
										</TooltipContent>
									</Tooltip>
								</div>
								<FormControl>
									<Popover open={open} onOpenChange={setOpen}>
										<PopoverTrigger asChild>
											<Button
												id="cfpId"
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
																<span className="font-medium">{cfp.code}</span>
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
								{form.formState.errors.cfpId?.message && (
									<FormMessage
										data-testid="grant-application-form-cfp-error"
										className="text-destructive"
										role="alert"
									>
										{form.formState.errors.cfpId.message}
									</FormMessage>
								)}
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="title"
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center gap-2">
									<FormLabel
										htmlFor="title"
										className="flex items-center gap-2"
										data-testid="grant-application-form-title-label"
									>
										Grant Application Title
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
											field.value.length < 10 && "text-red-500",
											field.value.length >= 10 && field.value.length <= 255 && "text-green-500",
										)}
										data-testid="grant-application-form-title-char-count"
										aria-live="polite"
									>
										{field.value.length}/255 characters
										{field.value.length < 10 ? ` (${10 - field.value.length} more required)` : ""}
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

					<FormField
						control={form.control}
						name="isResubmission"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center space-x-2">
								<FormControl>
									<Checkbox
										id="isResubmission"
										disabled={loading}
										checked={field.value}
										onCheckedChange={field.onChange}
										className="h-5 w-5 transition-all duration-200 focus:ring-2 focus:ring-primary"
										data-testid="grant-application-form-resubmission-checkbox"
										aria-describedby="resubmission-label resubmission-tooltip"
									/>
								</FormControl>
								<div className="flex items-center space-x-2">
									<FormLabel
										id="resubmission-label"
										htmlFor="isResubmission"
										className="text-sm font-medium cursor-pointer"
										data-testid="grant-application-form-resubmission-label"
									>
										This is a Re-Submission
									</FormLabel>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												className="p-0 h-4 w-4"
												data-testid="grant-application-form-resubmission-help"
												aria-label="Resubmission information"
											>
												<HelpCircle className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent
											id="resubmission-tooltip"
											data-testid="grant-application-form-resubmission-tooltip"
											role="tooltip"
										>
											Check this box if you are resubmitting a previously submitted grant
											application
										</TooltipContent>
									</Tooltip>
								</div>
								{form.formState.errors.isResubmission?.message && (
									<FormMessage
										data-testid="grant-application-form-resubmission-error"
										className="text-destructive"
										role="alert"
									>
										{form.formState.errors.isResubmission.message}
									</FormMessage>
								)}
							</FormItem>
						)}
					/>
					<div className="pt-10 flex justify-between">
						<Button onClick={onPressPrevious} aria-label="Go Back">
							Go Back
						</Button>
						{application && !canSubmit ? (
							<Button
								onClick={onPressNext}
								data-testid="grant-application-continue-button"
								aria-label="Continue to the next step"
							>
								Continue
							</Button>
						) : (
							<SubmitButton
								disabled={!form.formState.isValid || !canSubmit}
								isLoading={loading}
								data-testid="grant-application-form-submit"
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
