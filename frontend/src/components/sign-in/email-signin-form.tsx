import { SubmitButton } from "@/components/submit-button";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

const WHITE_LISTED_EMAILS = new Set([
	"allonwag@berkeley.edu",
	"dviraran@technion.ac.il",
	"mgrinstein@bwh.harvard.edu",
	"naftali.kaminski@yale.edu",
	"rotemka@ekmd.huji.ac.il",
]);

const emailSchema = z.object({
	email: z
		.string()
		.email({ message: "Invalid email address" })
		.refine((email) => WHITE_LISTED_EMAILS.has(email), {
			message: "This email address is not approved for our private beta. Please use another email address.",
		}),
});

export type EmailFormValues = z.infer<typeof emailSchema>;

export function EmailSigninForm({
	isLoading,
	onSubmit,
}: {
	isLoading: boolean;
	onSubmit: SubmitHandler<EmailFormValues>;
}) {
	const form = useForm<EmailFormValues>({
		defaultValues: { email: "" },
		delayError: 5,
		resolver: zodResolver(emailSchema),
	});

	return (
		<div data-testid="email-signin-form-container">
			<Form {...form}>
				<form className="mb-4" data-testid="email-signin-form" onSubmit={form.handleSubmit(onSubmit)}>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel htmlFor="email">Email</FormLabel>
								<FormControl>
									<Input
										autoCapitalize="none"
										autoComplete="email"
										autoCorrect="off"
										className="form-input"
										data-testid="email-signin-form-email-input"
										id="email"
										placeholder="name@example.com"
										type="email"
										{...field}
									/>
								</FormControl>
								{form.formState.errors.email?.message && (
									<FormMessage className="text-destructive" data-testid="email-input-error-message">
										{form.formState.errors.email.message}
									</FormMessage>
								)}
							</FormItem>
						)}
					/>
					<SubmitButton
						className="mb-2 mt-4 w-full"
						data-testid="email-signin-form-submit-button"
						disabled={!form.formState.isValid}
						isLoading={isLoading}
					>
						Send Magic Link
					</SubmitButton>
				</form>
			</Form>
		</div>
	);
}
