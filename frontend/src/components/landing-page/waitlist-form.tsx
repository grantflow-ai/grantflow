"use client";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { zodResolver } from "@hookform/resolvers/zod";
import { Control, useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";

import { z } from "zod";
import { AppButton } from "@/components/app-button";

const waitlistSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	name: z.string().min(1, "Please enter your name"),
});

export function WaitlistForm() {
	const form = useForm<z.infer<typeof waitlistSchema>>({
		defaultValues: {
			email: "",
			name: "",
		},
		resolver: zodResolver(waitlistSchema),
	});

	function onSubmit(values: z.infer<typeof waitlistSchema>) {
		console.log("Form submitted:", values);
	}

	return (
		<Form {...form}>
			<form className="space-y-2 md:space-y-1 mt-4 md:mt-0" onSubmit={form.handleSubmit(onSubmit)}>
				<WaitListFormItem
					formControl={form.control}
					id="email"
					label="Email address"
					name="email"
					placeholder="Type your email address"
					type="email"
				/>

				<WaitListFormItem
					formControl={form.control}
					id="name"
					label="Name"
					name="name"
					placeholder="Type your full name"
					type="text"
				/>
				<div className="flex justify-end mt-8 px-2">
					<AppButton className="text-base" type="submit">
						Join now
					</AppButton>
				</div>
			</form>
		</Form>
	);
}

function WaitListFormItem({
	formControl,
	id,
	label,
	name,
	placeholder,
	type,
}: {
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
			render={({ field }) => (
				<FormItem>
					<FormLabel className="font-heading font-light text-xl md:text-[0.95rem]">{label}</FormLabel>
					<FormControl className="mt-2 w-full h-auto md:w-[17rem]">
						<Input
							placeholder={placeholder}
							type={type}
							{...field}
							className="bg-white rounded-sm p-3 md:placeholder:font-light placeholder:text-lg md:placeholder:text-[1.05rem] placeholder:text-slate-500/70 md:placeholder:text-slate-500"
						/>
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
