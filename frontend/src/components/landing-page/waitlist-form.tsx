"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { type Control, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { addToWaitlist } from "@/actions/join-waitlist";
import AppInput from "@/components/input-field";
import { SubmitButton } from "@/components/submit-button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import type { WAITING_LIST_RESPONSE_CODES } from "@/enums";
import { waitlistSchema } from "@/schemas/waitlist-schema";
import { logError } from "@/utils/logging";
import { analyticsIdentify } from "@/utils/segment";

const showToast = (type: "error" | "success", message: string, description?: string) => {
	if (type === "success") {
		toast.success(message);
	} else {
		toast.error(message, { description: description ?? "Please try again or contact support." });
	}
};

const responseMessages: Record<WAITING_LIST_RESPONSE_CODES, string> = {
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

	async function onSubmit(values: z.infer<typeof waitlistSchema>): Promise<void> {
		setFormState({ message: "Sending your details...", status: "loading" });

		try {
			await analyticsIdentify(values.email, {
				email: values.email,
				firstName: values.name.split(" ")[0],
				lastName: values.name.split(" ").at(-1) ?? "",
			});
		} catch (error) {
			logError({ error, identifier: "waitlist-form: onSubmit" });
		}

		const result = await addToWaitlist(values);
		const message = responseMessages[result.code];

		if (result.error) {
			setFormState({ message, status: "error" });
		} else {
			setFormState({ message, status: "success" });
			showToast("success", message);
		}

		form.reset();
	}

	return (
		<Form {...form}>
			<form className="flex w-full min-w-[22rem] flex-col pe-0 md:mt-0" onSubmit={form.handleSubmit(onSubmit)}>
				<WaitListFormItem
					formControl={form.control}
					id="email"
					label="Email address"
					name="email"
					placeholder="Type your email address"
					testId="test-form-input-email"
					type="email"
				/>

				<WaitListFormItem
					className="mt-3"
					formControl={form.control}
					id="name"
					label="Name"
					name="name"
					placeholder="Type your full name"
					testId="test-form-input-name"
					type="text"
				/>

				<div className="mb-2 mt-8 flex justify-end px-2">
					<SubmitButton
						data-testid="waitlist-form-submit-button"
						disabled={!form.formState.isValid || formState.status === "loading"}
					>
						Join now
					</SubmitButton>
				</div>

				<div
					className={`overflow-hidden transition-all duration-300 ease-in-out
						${formState.status === "idle" ? "max-h-0 opacity-0" : "max-h-12 opacity-100"}`}
				>
					<p
						className={`w-full px-1 text-sm transition-all duration-300 ease-in-out
						${formState.status === "idle" ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"}
						${formState.status === "success" ? "text-success" : formState.status === "error" ? "text-error" : "text-gray-50"}`}
					>
						{formState.status === "loading" ? (
							<span className="flex items-center">
								<Spinner />
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

function Spinner() {
	return (
		<svg
			className="-ml-1 mr-3 size-4 animate-spin"
			fill="none"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle className="opacity-25" cx="12" cy="12" r="10" stroke="#FFFFFF" strokeWidth="4" />
			<path
				className="opacity-75"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				fill="currentColor"
			/>
		</svg>
	);
}

function WaitListFormItem({
	className,
	formControl,
	id,
	label,
	name,
	placeholder,
	testId,
	type,
}: {
	className?: string;
	formControl: Control<
		{
			email: string;
			name: string;
		},
		unknown,
		{
			email: string;
			name: string;
		}
	>;
	id: string;
	label: string;
	name: string;
	placeholder: string;
	testId: string;
	type: string;
}) {
	return (
		<FormField
			control={formControl}
			key={id}
			name={name === "email" ? "email" : "name"}
			render={({ field }) => (
				<FormItem className={className}>
					<FormLabel className="font-heading text-xl font-light md:text-base">{label}</FormLabel>
					<FormControl className="mt-3 h-auto w-full">
						<AppInput
							placeholder={placeholder}
							type={type}
							{...field}
							className={`form-input rounded-sm bg-white p-3 text-gray-600`}
							testId={testId}
						/>
					</FormControl>
				</FormItem>
			)}
		/>
	);
}