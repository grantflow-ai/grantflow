"use client";

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

import type * as LabelPrimitive from "@radix-ui/react-label";

const Form = FormProvider;

interface FormFieldContextValue<F extends FieldValues = FieldValues, N extends FieldPath<F> = FieldPath<F>> {
	name: N;
}

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

const FormField = <F extends FieldValues = FieldValues, N extends FieldPath<F> = FieldPath<F>>({
	...props
}: ControllerProps<F, N>) => {
	return (
		<FormFieldContext.Provider value={{ name: props.name }}>
			<Controller {...props} />
		</FormFieldContext.Provider>
	);
};

const useFormField = () => {
	const fieldContext = React.useContext(FormFieldContext);
	const itemContext = React.useContext(FormItemContext);
	const { formState, getFieldState } = useFormContext();

	const fieldState = getFieldState(fieldContext.name, formState);

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

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => {
		const id = React.useId();

		return (
			<FormItemContext.Provider value={{ id }}>
				<div className={cn("space-y-2", className)} ref={ref} {...props} />
			</FormItemContext.Provider>
		);
	},
);
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<
	React.ComponentRef<typeof LabelPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
	const { error, formItemId } = useFormField();

	return <Label className={cn(error && "text-destructive", className)} htmlFor={formItemId} ref={ref} {...props} />;
});
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<React.ComponentRef<typeof Slot>, React.ComponentPropsWithoutRef<typeof Slot>>(
	({ ...props }, ref) => {
		const { error, formDescriptionId, formItemId, formMessageId } = useFormField();

		return (
			<Slot
				aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
				aria-invalid={!!error}
				id={formItemId}
				ref={ref}
				{...props}
			/>
		);
	},
);
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
	({ className, ...props }, ref) => {
		const { formDescriptionId } = useFormField();

		return (
			<p className={cn("text-sm text-muted-foreground", className)} id={formDescriptionId} ref={ref} {...props} />
		);
	},
);
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
	({ children, className, ...props }, ref) => {
		const { error, formMessageId } = useFormField();
		const body = error ? String(error.message) : children;

		if (!body) {
			return null;
		}

		return (
			<p
				className={cn("text-sm font-medium text-destructive", className)}
				id={formMessageId}
				ref={ref}
				{...props}
			>
				{body}
			</p>
		);
	},
);
FormMessage.displayName = "FormMessage";

export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField };
