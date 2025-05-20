"use client";

import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";

import { Control, useForm } from "react-hook-form";

import { z } from "zod";
import { AppButton } from "@/components/app-button";

import { addToWaitlist } from "@/actions/join-waitlist";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { waitlistSchema } from "@/schemas/waitlist-schema";
import { WAITING_LIST_RESPONSE_CODES } from "@/enums";
import { AppInput } from "../input-field";

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
			<form className="flex flex-col w-full min-w-[22rem] md:mt-0 pe-0" onSubmit={form.handleSubmit(onSubmit)}>
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

				<div className="flex justify-end px-2 mt-8 mb-2">
					<AppButton
						className="text-base"
						disabled={!form.formState.isValid || formState.status === "loading"}
						type="submit"
					>
						Join now
					</AppButton>
				</div>

				<div
					className={`overflow-hidden transition-all duration-300 ease-in-out
						${formState.status === "idle" ? "max-h-0 opacity-0" : "max-h-12 opacity-100"}`}
				>
					<p
						className={`w-full text-sm px-1 transition-all duration-300 ease-in-out
						${formState.status === "idle" ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"}
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
			className="animate-spin -ml-1 mr-3 size-4"
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
					<FormLabel className="font-heading font-light text-xl md:text-base">{label}</FormLabel>
					<FormControl className="w-full h-auto mt-3">
						<AppInput
							placeholder={placeholder}
							type={type}
							{...field}
							className={`form-input bg-white text-gray-600 rounded-sm p-3`}
							testId={testId}
						/>
					</FormControl>
				</FormItem>
			)}
		/>
	);
}
