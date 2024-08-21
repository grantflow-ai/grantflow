"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

import { signInWithEmailOTP } from "@/actions/auth";
import { FormButton } from "@/components/form-button";
import { InfoMessage } from "@/constants";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";
import { toast } from "sonner";

const formSchema = z.object({
	email: z.string().email({ message: "Invalid email address" }),
});

export function EmailSigninForm() {
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
		},
	});

	const onSubmit: SubmitHandler<{ email: string }> = async (values: z.infer<typeof formSchema>) => {
		const error = await signInWithEmailOTP(values.email);
		if (error) {
			toast.error(error, { duration: 3000 });
			return;
		}
		toast.info(InfoMessage.EMAIL_OTP_SENT, { duration: 3000 });
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="mb-4" data-testid="email-signin-form">
				<FormField
					name="email"
					control={form.control}
					render={({ field }) => (
						<FormItem>
							<FormLabel htmlFor="email">Email</FormLabel>
							<FormControl>
								<Input
									id="email"
									placeholder="name@example.com"
									type="email"
									autoCapitalize="none"
									autoComplete="email"
									autoCorrect="off"
									className="form-input"
									data-testid="email-signin-form-email-input"
									{...field}
								/>
							</FormControl>
							{form.formState.errors.email?.message && (
								<FormMessage data-testid="email-input-error-message" className="text-destructive">
									{form.formState.errors.email.message}
								</FormMessage>
							)}
						</FormItem>
					)}
				/>
				<FormButton
					className="mt-4 mb-2 w-full"
					isLoading={form.formState.isSubmitting}
					disabled={!form.formState.isValid}
					data-testid="email-signin-form-submit-button"
				>
					Sign in
				</FormButton>
			</form>
		</Form>
	);
}
