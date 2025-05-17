"use client";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { Control, useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";

import { z } from "zod";
import { AppButton } from "@/components/app-button";

import { addToWaitlist, RESPONSE_CODES, waitlistSchema } from "@/actions/join-waitlist";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const showToast = (type: "error" | "success", message: string, description?: string) => {
	if (type === "success") {
		toast.success(message);
	} else {
		toast.error(message, { description: description ?? "Please try again or contact support." });
	}
};

const responseMessages: Record<RESPONSE_CODES, string> = {
	SERVER_ERROR: "Something went wrong on our end. Please try again later.",
	SUCCESS: "Thank you! You've successfully joined the waitlist.",
	VALIDATION_ERROR: "Please check your information and try again.",
};

export function WaitlistForm() {
	const [formState, setFormState] = useState<{ message: string; status: "error" | "idle" | "loading" | "success" }>({
		message: "",
		status: "idle",
	});

	const form = useForm<z.infer<typeof waitlistSchema>>({
		defaultValues: {
			email: "",
			name: "",
		},
		resolver: zodResolver(waitlistSchema),
	});

	const setFieldErrors = (errors?: { email?: string[]; name?: string[] } | null) => {
		if (!errors) {
			return;
		}
		if (errors.email?.[0]) {
			form.setError("email", { message: errors.email[0] });
		}
		if (errors.name?.[0]) {
			form.setError("name", { message: errors.name[0] });
		}
	};

	async function onSubmit(values: z.infer<typeof waitlistSchema>) {
		setFormState({ message: "Sending your details...", status: "loading" });

		const result = await addToWaitlist(values);
		const message = responseMessages[result.code];

		if (result.errors) {
			setFieldErrors(result.errors);
			setFormState({ message, status: "error" });
		} else {
			setFormState({ message, status: "success" });
			form.reset();
			showToast("success", message);
		}

		return values;
	}

	return (
		<Form {...form}>
			<form className="space-y-2 md:space-y-0 mt-4 md:mt-0 pe-7 md:pe-0" onSubmit={form.handleSubmit(onSubmit)}>
				<WaitListFormItem
					formControl={form.control}
					id="email"
					label="Email address"
					name="email"
					placeholder="Type your email address"
					type="email"
				/>

				<WaitListFormItem
					className="-mt-2"
					formControl={form.control}
					id="name"
					label="Name"
					name="name"
					placeholder="Type your full name"
					type="text"
				/>

				<div className="flex justify-end mt-4 px-2">
					<AppButton className="text-base" type="submit">
						Join now
					</AppButton>
				</div>

				<div className="h-12 mt-2 w-full relative">
					<p
						className={`absolute inset-0 transition-opacity duration-200 text-wrap
						${formState.status === "idle" ? "opacity-0" : "opacity-100"}
						${formState.status === "success" ? "text-success" : formState.status === "error" ? "text-error" : "text-gray-50"}
					`}
					>
						{formState.status === "loading" ? (
							<span className="flex items-center">
								<svg
									className="animate-spin -ml-1 mr-3 size-4"
									fill="none"
									viewBox="0 0 24 24"
									xmlns="http://www.w3.org/2000/svg"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="#FFFFFF"
										strokeWidth="4"
									></circle>
									<path
										className="opacity-75"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										fill="currentColor"
									></path>
								</svg>
								{formState.message}
							</span>
						) : (
							formState.message
						)}
					</p>
				</div>
			</form>
		</Form>
	);
}

function WaitListFormItem({
	className,
	formControl,
	id,
	label,
	name,
	placeholder,
	type,
}: {
	className?: string;
	formControl: Control<
		{
			email: string;
			name: string;
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		any,
		{
			email: string;
			name: string;
		}
	>;
	id: string;
	label: string;
	name: string;
	placeholder: string;
	type: string;
}) {
	return (
		<FormField
			control={formControl}
			key={id}
			name={name === "email" ? "email" : "name"}
			render={({ field, fieldState }) => (
				<FormItem className={className}>
					<FormLabel className="font-heading font-light text-xl md:text-base">{label}</FormLabel>
					<FormControl className="mt-2 w-full h-auto md:w-[17rem]">
						<Input
							placeholder={placeholder}
							type={type}
							{...field}
							className={`bg-white text-gray-600 rounded-sm p-3 md:placeholder:font-light placeholder:text-lg md:placeholder:text-[1.05rem] placeholder:text-slate-500/70 md:placeholder:text-slate-500 ${
								fieldState.invalid ? "border-error focus-visible:ring-error" : ""
							}`}
						/>
					</FormControl>
					<div className="min-h-5 text-end">
						<FormMessage
							className="text-sm text-error"
							data-testid={name === "email" ? "email-error" : "name-error"}
						/>
					</div>
				</FormItem>
			)}
		/>
	);
}
