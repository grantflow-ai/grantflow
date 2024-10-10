import { format } from "date-fns";
import { cn } from "gen/cn";
import { Button } from "gen/ui/button";
import { Calendar } from "gen/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "gen/ui/popover";
import { Switch } from "gen/ui/switch";
import { Textarea } from "gen/ui/textarea";
import { CalendarIcon } from "lucide-react";
import type { JSX } from "react";
import { GrantApplicationQuestion } from "@/types/database-types";

export type ValueType = undefined | boolean | string | number | { from?: number; to?: number };

export type InputType<T extends GrantApplicationQuestion["input_type"]> = T extends "text"
	? string
	: T extends "boolean"
		? boolean
		: T extends "date"
			? number
			: T extends "date-range"
				? { from?: number; to?: number }
				: never;

export interface QuestionInputProps<T extends GrantApplicationQuestion["input_type"]> {
	questionId: string;
	required: boolean;
	maxLength: number | null;
	onValueChange: (value?: InputType<T>) => void;
	value?: InputType<T>;
	disabled: boolean;
}

export type QuestionInputComponent<T extends GrantApplicationQuestion["input_type"]> = (
	props: QuestionInputProps<T>,
) => JSX.Element;

const TextInput = ({ questionId, onValueChange, maxLength, required, value, disabled }: QuestionInputProps<"text">) => {
	return (
		<div data-testid={`question-${questionId}-input`} className="w-full h-full">
			<Textarea
				id={`question-${questionId}`}
				onChange={(event) => {
					onValueChange(event.target.value);
				}}
				disabled={disabled}
				value={value}
				maxLength={maxLength ?? undefined}
				required={required}
				className="mt-1"
			/>
		</div>
	);
};

const BooleanInput = ({ questionId, onValueChange, required, value, disabled }: QuestionInputProps<"boolean">) => {
	return (
		<div data-testid={`question-${questionId}-input`} className="flex items-center gap-2">
			<Switch
				id={`question-${questionId}`}
				onCheckedChange={onValueChange}
				required={required}
				checked={value}
				disabled={disabled}
			/>
		</div>
	);
};

const DateInput = ({ questionId, onValueChange, required, value, disabled }: QuestionInputProps<"date">) => {
	return (
		<div data-testid={`question-${questionId}-input`}>
			<Popover>
				<PopoverTrigger asChild={true}>
					<Button
						variant="outline"
						disabled={disabled}
						className={cn("w-full justify-start text-left font-normal mt-1", disabled && "text-muted-foreground")}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{value ? format(value, "PPP") : <span>Pick a date</span>}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0">
					<Calendar
						mode="single"
						selected={value ? new Date(value) : undefined}
						onSelect={(newDate) => {
							onValueChange(newDate?.getTime());
						}}
						initialFocus={true}
						required={required}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
};

const DateRangeInput = ({ questionId, onValueChange, required, value, disabled }: QuestionInputProps<"date-range">) => {
	return (
		<div data-testid={`question-${questionId}-input`}>
			<div className="flex gap-2 mt-1">
				<Popover>
					<PopoverTrigger asChild={true}>
						<Button
							id={`question-${questionId}-from`}
							variant="outline"
							disabled={disabled}
							className={cn("w-[240px] justify-start text-left font-normal", !value?.from && "text-muted-foreground")}
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{value?.from ? format(value.from, "PPP") : <span>Start date</span>}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={value?.from ? new Date(value.from) : undefined}
							onSelect={(date) => {
								const newRange = { ...value, from: date?.getTime() };
								onValueChange(newRange);
							}}
							initialFocus={true}
							required={required}
						/>
					</PopoverContent>
				</Popover>
				<Popover>
					<PopoverTrigger asChild={true}>
						<Button
							id={`question-${questionId}-to`}
							variant="outline"
							disabled={disabled}
							className={cn("w-[240px] justify-start text-left font-normal", !value?.to && "text-muted-foreground")}
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{value?.to ? format(value.to, "PPP") : <span>End date</span>}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={value?.to ? new Date(value.to) : undefined}
							onSelect={(date) => {
								const newRange = { ...value, to: date?.getTime() };
								onValueChange(newRange);
							}}
							initialFocus={true}
							required={required}
						/>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
};

export function getInputComponent<T extends GrantApplicationQuestion["input_type"]>(
	answerType: T,
): QuestionInputComponent<T> {
	if (answerType === "text") {
		return TextInput as QuestionInputComponent<T>;
	}
	if (answerType === "boolean") {
		return BooleanInput as QuestionInputComponent<T>;
	}
	if (answerType === "date") {
		return DateInput as QuestionInputComponent<T>;
	}
	if (answerType === "date-range") {
		return DateRangeInput as QuestionInputComponent<T>;
	}
	throw new Error(`Unknown answer type: ${answerType}`);
}
