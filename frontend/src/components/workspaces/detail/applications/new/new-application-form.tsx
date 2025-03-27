import { ChangeEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MIN_TITLE_LENGTH, NewGrantApplicationFormValues, newGrantApplicationSchema } from "@/schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CharacterCount } from "@/components/character-count";

export function NewApplicationForm({ onSubmit }: { onSubmit: (data: NewGrantApplicationFormValues) => Promise<void> }) {
	const [isProcessing, setIsProcessing] = useState(false);

	const form = useForm<NewGrantApplicationFormValues>({
		defaultValues: {
			cfpFile: undefined,
			cfpUrl: "",
			title: "",
		},
		resolver: zodResolver(newGrantApplicationSchema),
	});

	const handleSubmit = async (data: NewGrantApplicationFormValues) => {
		setIsProcessing(true);
		try {
			await onSubmit(data);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "An error occurred");
		} finally {
			setIsProcessing(false);
		}
	};

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>, fieldName: "cfpFile") => {
		const file = e.target.files?.[0];
		if (file) {
			form.setValue(fieldName, file);
			form.setValue("cfpUrl", "");
		} else {
			form.setValue(fieldName, undefined);
		}
	};

	return (
		<TooltipProvider>
			<Form {...form}>
				<form
					className="space-y-8"
					data-testid="new-application-form"
					onSubmit={form.handleSubmit(handleSubmit)}
				>
					<FormField
						control={form.control}
						name="title"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Grant Application Title</FormLabel>
								<FormControl>
									<Input
										{...field}
										data-testid="grant-title-input"
										placeholder="Enter grant application title"
									/>
								</FormControl>
								{field.value && (
									<CharacterCount
										className="text-muted-foreground"
										maxLength={255}
										minLength={MIN_TITLE_LENGTH}
										value={field.value}
									/>
								)}
								<FormMessage />
							</FormItem>
						)}
					/>

					<Separator className="my-8" />

					<div className="space-y-4">
						<h3 className="text-md font-semibold">Upload Call for Proposal (CFP)</h3>
						<FormField
							control={form.control}
							name="cfpFile"
							render={({
								field: {
									// eslint-disable-next-line @typescript-eslint/no-unused-vars
									onChange,
									// eslint-disable-next-line @typescript-eslint/no-unused-vars
									value,
									...field
								},
							}) => (
								<FormItem>
									<FormControl>
										<Input
											accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
											data-testid="cfp-file-upload"
											disabled={!!form.watch("cfpUrl")}
											onChange={(e) => {
												handleFileChange(e, "cfpFile");
											}}
											type="file"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="cfpUrl"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Or enter document URL</FormLabel>
									<FormControl>
										<Input
											{...field}
											aria-label="Enter document URL"
											data-testid="cfp-url-input"
											disabled={!!form.watch("cfpFile")}
											onChange={(e) => {
												field.onChange(e);
												if (e.target.value) {
													form.setValue("cfpFile", undefined);
												}
											}}
											placeholder="https://..."
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<Separator className="my-8" />

					<div className="pt-4 flex justify-end">
						<Button data-testid="submit-application-button" disabled={isProcessing} type="submit">
							{isProcessing ? "Processing..." : "Continue"}
						</Button>
					</div>
				</form>
			</Form>
		</TooltipProvider>
	);
}
