"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

import { updatePassword } from "@/actions/auth";
import { FormButton } from "@/components/form-button";
import { PagePath } from "@/config/enums";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";

const formSchema = z
	.object({
		password: z.string().min(8, { message: "Password must be at least 8 characters" }),
		passwordConfirm: z.string().min(8, { message: "Password must be at least 8 characters" }),
	})
	.refine((data) => data.password === data.passwordConfirm, {
		message: "Passwords don't match",
		path: ["passwordConfirm"],
	});

export function UpdatePasswordForm() {
	const router = useRouter();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
	});

	const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (values) => {
		await updatePassword(values.password, values.passwordConfirm);
		router.push(PagePath.ROOT);
	};

	return (
		<Form {...form}>
			<form className="mb-4" onSubmit={form.handleSubmit(onSubmit)} data-testid="update-password-form">
				<FormField
					name="password"
					control={form.control}
					render={({ field }) => (
						<FormItem>
							<FormLabel htmlFor="password">New Password</FormLabel>
							<FormControl>
								<Input
									id="password"
									placeholder="Password"
									type="password"
									autoComplete="new-password"
									className="form-input"
									data-testid="update-password-form-password-input"
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
				<FormField
					name="passwordConfirm"
					control={form.control}
					render={({ field }) => (
						<FormItem>
							<FormLabel htmlFor="passwordConfirm">Confirm New Password</FormLabel>
							<FormControl>
								<Input
									id="passwordConfirm"
									placeholder="Password"
									type="password"
									autoComplete="new-password"
									className="form-input"
									data-testid="update-password-form-password-confirm-input"
									{...field}
								/>
							</FormControl>
							{form.formState.errors.passwordConfirm?.message && (
								<FormMessage data-testid="password-confirm-input-error-message" className="text-destructive">
									{form.formState.errors.passwordConfirm.message}
								</FormMessage>
							)}
						</FormItem>
					)}
				/>
				<FormButton
					className="mt-4 mb-2 w-full"
					isLoading={form.formState.isSubmitting}
					disabled={!form.formState.isValid}
					data-testid="update-password-form-submit-button"
				>
					Update Password
				</FormButton>
			</form>
		</Form>
	);
}
