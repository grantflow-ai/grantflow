"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

import { signInWithPassword } from "@/actions/auth";
import { FormButton } from "@/components/form-button";
import { PagePath } from "@/config/enums";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";
import { toast } from "sonner";

const formSchema = z.object({
	email: z.string().email({ message: "Invalid email address" }),
	password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

export function PasswordSigninForm() {
	const router = useRouter();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (values) => {
		const error = await signInWithPassword(values.email, values.password);
		if (error) {
			toast.error(error, { duration: 3000 });
			return;
		}
		router.push(PagePath.ROOT);
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} data-testid="password-signin-form">
				<FormField
					name="email"
					control={form.control}
					render={({ field }) => (
						<FormItem data-testid="password-signin-form-email-item">
							<FormLabel htmlFor="email" data-testid="password-signin-form-email-label">
								Email
							</FormLabel>
							<FormControl data-testid="password-signin-form-email-control">
								<Input
									id="email"
									placeholder="name@example.com"
									type="email"
									autoCapitalize="none"
									autoComplete="email"
									autoCorrect="off"
									className="form-input"
									data-testid="password-signin-form-email-input"
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
				<FormField
					name="password"
					control={form.control}
					render={({ field }) => (
						<FormItem data-testid="password-signin-form-password-item">
							<FormLabel htmlFor="password" data-testid="password-signin-form-password-label">
								Password
							</FormLabel>
							<FormControl data-testid="password-signin-form-password-control">
								<Input
									id="password"
									placeholder="Password"
									type="password"
									autoComplete="current-password"
									className="form-input"
									data-testid="password-signin-form-password-input"
									{...field}
								/>
							</FormControl>
							{form.formState.errors.password?.message && (
								<FormMessage data-testid="password-input-error-message" className="text-destructive">
									{form.formState.errors.password.message}
								</FormMessage>
							)}
						</FormItem>
					)}
				/>
				<FormButton
					className="mt-4 mb-2 w-full"
					data-testid="password-signin-form-submit-button"
					disabled={!form.formState.isValid}
					isLoading={form.formState.isSubmitting}
				>
					Sign in
				</FormButton>
			</form>
		</Form>
	);
}
