"use client";

import type * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import {
	Controller,
	type ControllerProps,
	type FieldPath,
	type FieldValues,
	FormProvider,
	useFormContext,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const Form = FormProvider;

interface FormFieldContextValue<T extends FieldValues = FieldValues, U extends FieldPath<T> = FieldPath<T>> {
	name: U;
}

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

const FormField = <T extends FieldValues = FieldValues, U extends FieldPath<T> = FieldPath<T>>({
	...props
}: ControllerProps<T, U>) => {
	return (
		<FormFieldContext.Provider value={{ name: props.name }}>
			<Controller {...props} />
		</FormFieldContext.Provider>
	);
};

const useFormField = () => {
	const fieldContext = React.useContext(FormFieldContext);
	const itemContext = React.useContext(FormItemContext);

	const { getFieldState } = useFormContext();
	const fieldState = getFieldState(fieldContext.name);

	const { id } = itemContext;

	return {
		formDescriptionId: `${id}-form-item-description`,
		formItemId: `${id}-form-item`,
		formMessageId: `${id}-form-item-message`,
		id,
		name: fieldContext.name,
		...fieldState,
	};
};

interface FormItemContextValue {
	id: string;
}

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
	const { error, formDescriptionId, formItemId, formMessageId } = useFormField();

	return (
		<Slot
			aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
			aria-invalid={!!error}
			data-slot="form-control"
			id={formItemId}
			{...props}
		/>
	);
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
	const { formDescriptionId } = useFormField();

	return (
		<p
			className={cn("text-muted-foreground text-sm", className)}
			data-slot="form-description"
			id={formDescriptionId}
			{...props}
		/>
	);
}

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
	const id = React.useId();

	return (
		<FormItemContext.Provider value={{ id }}>
			<div className={cn("grid gap-2", className)} data-slot="form-item" {...props} />
		</FormItemContext.Provider>
	);
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
	const { error, formItemId } = useFormField();

	return (
		<Label
			className={cn("data-[error=true]:text-destructive", className)}
			data-error={!!error}
			data-slot="form-label"
			htmlFor={formItemId}
			{...props}
		/>
	);
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
	const { error, formMessageId } = useFormField();
	const body = error ? String(error.message ?? "") : props.children;

	if (!body) {
		return null;
	}

	return (
		<p className={cn("text-destructive text-sm", className)} data-slot="form-message" id={formMessageId} {...props}>
			{body}
		</p>
	);
}

export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField };
