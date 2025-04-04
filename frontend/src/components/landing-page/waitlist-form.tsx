"use client";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { z } from "zod";

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
			<form className="space-y-1" onSubmit={form.handleSubmit(onSubmit)}>
				<FormField
					control={form.control}
					key="email"
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="font-heading font-light mb-2">Email address</FormLabel>
							<FormControl>
								<Input
									placeholder="Type your email address"
									type="email"
									{...field}
									className="bg-white rounded p-2 w-full placeholder:text-neutral-400"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					key="name"
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="font-heading font-light">Name</FormLabel>
							<FormControl>
								<Input
									placeholder="Type your full name"
									type="text"
									{...field}
									className="bg-white rounded p-2 w-full placeholder:text-neutral-400"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex justify-end mt-8 px-2">
					<Button type="submit">Join now</Button>
				</div>
			</form>
		</Form>
	);
}
