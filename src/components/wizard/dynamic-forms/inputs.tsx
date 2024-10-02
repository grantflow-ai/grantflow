import { Switch } from "gen/ui/switch";
import type { Question } from "@/components/wizard/dynamic-forms/types";
import { Textarea } from "gen/ui/textarea";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "gen/ui/popover";
import { Button } from "gen/ui/button";
import { cn } from "gen/cn";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "gen/ui/calendar";
import type { JSX } from "react";

export type InputType<T extends Question["answerType"]> = T extends "text"
	? string
	: T extends "boolean"
		? boolean
		: T extends "date"
			? Date
			: T extends "date-range"
				? { from?: Date; to?: Date }
				: never;

export type QuestionInputProps<T extends Question["answerType"]> = Pick<
	Question,
	"questionId" | "required" | "maxLength"
> & {
	onValueChange: (value?: InputType<T>) => void;
};

export type QuestionInputComponent<T extends Question["answerType"]> = (props: QuestionInputProps<T>) => JSX.Element;

const TextInput = ({ questionId, onValueChange, maxLength, required }: QuestionInputProps<"text">) => {
	return (
		<div data-testid={`question-${questionId}-input`} className="w-full h-full">
			<Textarea
				id={`question-${questionId}`}
				onChange={(event) => {onValueChange(event.target.value)}}
				maxLength={maxLength ?? undefined}
				required={required}
				className="mt-1"
			/>
		</div>
	);
};

const BooleanInput = ({ questionId, onValueChange, required }: QuestionInputProps<"boolean">) => {
	return (
		<div data-testid={`question-${questionId}-input`} className="flex items-center gap-2">
			<Switch id={`question-${questionId}`} onCheckedChange={onValueChange} required={required} />
		</div>
	);
};

const DateInput = ({ questionId, onValueChange, required }: QuestionInputProps<"date">) => {
	const [date, setDate] = useState<Date | undefined>(undefined);

	return (
		<div data-testid={`question-${questionId}-input`}>
			<Popover>
				<PopoverTrigger asChild={true}>
					<Button
						variant="outline"
						className={cn("w-full justify-start text-left font-normal mt-1", !date && "text-muted-foreground")}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{date ? format(date, "PPP") : <span>Pick a date</span>}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0">
					<Calendar
						mode="single"
						selected={date}
						onSelect={(newDate) => {
							setDate(newDate);
							onValueChange(newDate);
						}}
						initialFocus={true}
						required={required}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
};

const DateRangeInput = ({ questionId, onValueChange, required }: QuestionInputProps<"date-range">) => {
	const [dateRange, setDateRange] = useState<{
		from: Date | undefined;
		to: Date | undefined;
	}>({
		from: undefined,
		to: undefined,
	});

	return (
		<div data-testid={`question-${questionId}-input`}>
			<div className="flex gap-2 mt-1">
				<Popover>
					<PopoverTrigger asChild={true}>
						<Button
							id={`question-${questionId}-from`}
							variant="outline"
							className={cn(
								"w-[240px] justify-start text-left font-normal",
								!dateRange.from && "text-muted-foreground",
							)}
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{dateRange.from ? format(dateRange.from, "PPP") : <span>Start date</span>}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={dateRange.from}
							onSelect={(date) => {
								const newRange = { ...dateRange, from: date };
								setDateRange(newRange);
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
							className={cn("w-[240px] justify-start text-left font-normal", !dateRange.to && "text-muted-foreground")}
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{dateRange.to ? format(dateRange.to, "PPP") : <span>End date</span>}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={dateRange.to}
							onSelect={(date) => {
								const newRange = { ...dateRange, to: date };
								setDateRange(newRange);
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

export function getInputComponent<T extends Question["answerType"]>(answerType: T): QuestionInputComponent<T> {
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
