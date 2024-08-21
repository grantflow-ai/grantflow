"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

import { requestPasswordUpdate } from "@/actions/auth";
import { FormButton } from "@/components/form-button";
import { PagePath } from "@/config/enums";
import { InfoMessage } from "@/constants";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";
import { toast } from "sonner";

const formSchema = z.object({
	email: z.string().email({ message: "Invalid email address" }),
});

export function ForgotPasswordForm() {
	const router = useRouter();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
		},
	});

	const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (values: z.infer<typeof formSchema>) => {
		const error = await requestPasswordUpdate(values.email);
		if (error) {
			toast.error(error, { duration: 3000 });
			return;
		}
		toast.success(InfoMessage.PASSWORD_RESET_LINK_SENT, { duration: 3000 });
		router.push(PagePath.ROOT);
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} data-testid="forgot-password-form">
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email</FormLabel>
							<FormControl>
								<Input
									{...field}
									placeholder="name@example.com"
									type="email"
									autoCapitalize="none"
									autoComplete="email"
									autoCorrect="off"
									className="form-input"
									data-testid="forgot-password-form-email-input"
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
					data-testid="forgot-password-form-submit-button"
					disabled={!form.formState.isValid}
					isLoading={form.formState.isSubmitting}
				>
					Send Reset Password Email
				</FormButton>
			</form>
		</Form>
	);
}
