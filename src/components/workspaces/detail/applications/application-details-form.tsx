import { GrantApplicationFormValues } from "@/components/workspaces/detail/applications/schema";
import { GrantCfp } from "@/types/api-types";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, ChevronsUpDown, HelpCircle } from "lucide-react";
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";

export function ApplicationDetailsForm({
	cfps,
	form,
	loading,
}: {
	cfps: GrantCfp[];
	form: UseFormReturn<GrantApplicationFormValues>;
	loading: boolean;
}) {
	const [title, setTitle] = useState("Select an NIH Activity Code");
	const [open, setOpen] = useState(false);

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
		<section className="space-y-6">
			<h2 className="text-xl font-semibold mb-4">Grant Details</h2>
			<FormField
				control={form.control}
				name="cfp_id"
				render={({ field }) => (
					<FormItem className="space-y-2">
						<div className="flex items-center gap-2">
							<FormLabel data-testid="grant-application-form-cfp-label" htmlFor="cfp_id">
								NIH Activity Code <span className="text-red-300 p-0">*</span>
							</FormLabel>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										aria-label="NIH Activity Code information"
										className="p-0 h-4 w-4"
										data-testid="grant-application-form-cfp-help"
										type="button"
										variant="ghost"
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
							<Popover onOpenChange={setOpen} open={open}>
								<PopoverTrigger asChild>
									<Button
										aria-controls="cfp-options"
										aria-expanded={open}
										aria-haspopup="listbox"
										aria-label="Select NIH Activity Code"
										className="w-full justify-between"
										data-testid="grant-application-form-cfp-select"
										id="cfp_id"
										role="combobox"
										type="button"
										variant="outline"
									>
										{title}
										<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-full max-w-md p-0">
									<Command>
										<CommandInput
											aria-label="Search NIH Activity Codes"
											data-testid="grant-application-form-cfp-search"
											disabled={loading}
											placeholder="Search NIH Activity Codes..."
										/>
										<CommandEmpty data-testid="grant-application-form-cfp-empty" role="status">
											No activity code found.
										</CommandEmpty>
										<CommandGroup className="max-h-60 overflow-y-auto">
											<CommandList id="cfp-options" role="listbox">
												{cfps.map((cfp) => (
													<CommandItem
														aria-selected={field.value === cfp.id}
														data-testid={`grant-application-form-cfp-option-${cfp.code}`}
														key={cfp.id}
														onSelect={(currentValue) => {
															field.onChange(currentValue);
															setOpen(false);
														}}
														role="option"
														value={cfp.id}
													>
														<Check
															aria-hidden="true"
															className={cn(
																"mr-2 h-4 w-4",
																field.value === cfp.id ? "opacity-100" : "opacity-0",
															)}
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
						{form.formState.errors.cfp_id?.message && (
							<FormMessage
								className="text-destructive"
								data-testid="grant-application-form-cfp-error"
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
							<FormLabel data-testid="grant-application-form-title-label" htmlFor="title">
								Grant Application Title <span className="text-red-300 p-0">*</span>
							</FormLabel>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										aria-label="Grant title information"
										className="p-0 h-4 w-4"
										data-testid="grant-application-form-title-help"
										type="button"
										variant="ghost"
									>
										<HelpCircle className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent data-testid="grant-application-form-title-tooltip" role="tooltip">
									Enter a descriptive title for your grant application
								</TooltipContent>
							</Tooltip>
						</div>
						<FormControl>
							<Input
								{...field}
								aria-invalid={!!form.formState.errors.title}
								aria-required="true"
								className="transition-all duration-200 focus:ring-2 focus:ring-primary"
								data-testid="grant-application-form-title-input"
								disabled={loading}
								id="title"
								placeholder="Enter the Grant Application Title"
							/>
						</FormControl>
						{field.value && (
							<p
								aria-live="polite"
								className={cn(
									"text-xs text-muted-foreground transition-colors duration-200",
									field.value.length < 10 && "text-red-500",
									field.value.length >= 10 && field.value.length <= 255 && "text-green-500",
								)}
								data-testid="grant-application-form-title-char-count"
								id="title-counter"
							>
								{field.value.length}/255 characters
								{field.value.length < 10 ? ` (${10 - field.value.length} more required)` : ""}
							</p>
						)}
						{form.formState.errors.title?.message && (
							<FormMessage
								className="text-destructive"
								data-testid="grant-application-form-title-error"
								id="title-error"
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
				name="significance"
				render={({ field }) => (
					<FormItem className="space-y-2">
						<div className="flex items-center gap-2">
							<FormLabel
								data-testid="significance-innovation-form-significance-label"
								htmlFor="significance"
							>
								Research Significance
							</FormLabel>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										aria-label="Research significance information"
										className="p-0 h-4 w-4"
										data-testid="significance-innovation-form-significance-help"
										type="button"
										variant="ghost"
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
								aria-invalid={!!form.formState.errors.significance}
								aria-required="true"
								className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary"
								data-testid="significance-innovation-form-significance-input"
								disabled={loading}
								id="significance.text"
								placeholder="Describe the significance of your research"
								ref={(textarea) => {
									if (textarea) {
										textarea.style.height = "0px";
										textarea.style.height = `${textarea.scrollHeight}px`;
									}
								}}
							/>
						</FormControl>
						{field.value && (
							<p
								aria-live="polite"
								className={cn(
									"text-xs text-muted-foreground transition-colors duration-200",
									"text-green-500",
								)}
								data-testid="significance-innovation-form-significance-char-count"
								id="significance-counter"
							>
								{field.value.length} characters
							</p>
						)}
						{form.formState.errors.significance?.message && (
							<FormMessage
								className="text-destructive"
								data-testid="significance-innovation-form-significance-error"
								id="significance-error"
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
							<FormLabel data-testid="significance-innovation-form-innovation-label" htmlFor="innovation">
								Research Innovation
							</FormLabel>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										aria-label="Research innovation information"
										className="p-0 h-4 w-4"
										data-testid="significance-innovation-form-innovation-help"
										type="button"
										variant="ghost"
									>
										<HelpCircle className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent
									data-testid="significance-innovation-form-innovation-tooltip"
									role="tooltip"
								>
									Describe the novel aspects of your project and how it challenges or shifts current
									research or clinical practice paradigms.
								</TooltipContent>
							</Tooltip>
						</div>
						<FormControl>
							<Textarea
								{...field}
								aria-invalid={!!form.formState.errors.innovation}
								aria-required="true"
								className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary"
								data-testid="significance-innovation-form-innovation-input"
								disabled={loading}
								id="innovation.text"
								placeholder="Describe the innovation of your research"
								ref={(textarea) => {
									if (textarea) {
										textarea.style.height = "0px";
										textarea.style.height = `${textarea.scrollHeight}px`;
									}
								}}
							/>
						</FormControl>
						{field.value && (
							<p
								aria-live="polite"
								className={cn(
									"text-xs text-muted-foreground transition-colors duration-200",
									"text-green-500",
								)}
								data-testid="significance-innovation-form-innovation-char-count"
								id="innovation-counter"
							>
								{field.value.length} characters
							</p>
						)}
						{form.formState.errors.innovation?.message && (
							<FormMessage
								className="text-destructive"
								data-testid="significance-innovation-form-innovation-error"
								id="innovation-error"
								role="alert"
							>
								{form.formState.errors.innovation.message}
							</FormMessage>
						)}
					</FormItem>
				)}
			/>
		</section>
	);
}
