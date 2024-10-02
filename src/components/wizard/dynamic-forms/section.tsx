"use client";

import { format } from "date-fns";
import { cn } from "gen/cn";
import { Button } from "gen/ui/button";
import { Calendar } from "gen/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "gen/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "gen/ui/popover";
import { Switch } from "gen/ui/switch";
import { Textarea } from "gen/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { type JSX, useState } from "react";
import { titleize, underscore } from "inflection";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "gen/ui/collapsible";
import { CaretSortIcon } from "@radix-ui/react-icons";

export interface Question {
	questionId: number;
	questionText: string;
	required: boolean;
	allowFileUpload: boolean;
	dependsOn: number | number[] | null;
	answerType: "text" | "boolean" | "date-range" | "date";
	maxLength?: number | null;
}

export interface Section {
	sectionId: number;
	name: string;
	description: string;
	questions: Question[];
}

interface QuestionProps extends Question {
	onValueChange: (value: unknown) => void;
	dependencyMet: boolean;
}

type QuestionInputProps = Pick<QuestionProps, "questionId" | "onValueChange" | "required" | "maxLength">;

const TextInput = ({ questionId, onValueChange, maxLength, required }: QuestionInputProps) => {
	return (
		<div data-testid={`question-${questionId}-input`} className="w-full h-full">
			<Textarea
				id={`question-${questionId}`}
				onChange={onValueChange}
				maxLength={maxLength ?? undefined}
				required={required}
				className="mt-1"
			/>
		</div>
	);
};

const BooleanInput = ({ questionId, onValueChange, required }: QuestionInputProps) => {
	return (
		<div data-testid={`question-${questionId}-input`} className="flex items-center gap-2">
			<Switch id={`question-${questionId}`} onCheckedChange={onValueChange} required={required} />
		</div>
	);
};

const DateInput = ({ questionId, onValueChange, required }: QuestionInputProps) => {
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

const DateRangeInput = ({ questionId, onValueChange, required }: QuestionInputProps) => {
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

const inputMap: Record<Question["answerType"], (props: QuestionInputProps) => JSX.Element> = {
	text: TextInput,
	boolean: BooleanInput,
	date: DateInput,
	"date-range": DateRangeInput,
};

const Question = ({
	answerType,
	dependencyMet,
	onValueChange,
	required,
	maxLength,
	questionId,
	questionText,
}: QuestionProps) => {
	const [isOpen, setIsOpen] = useState(false);

	if (!dependencyMet) {
		return null;
	}

	const InputComponent = inputMap[answerType];
	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full space-y-2">
			<div className="mb-4">
				<CollapsibleTrigger asChild>
					<Button variant="ghost" size="sm" className="flex gap-2 items-center">
						<h4 className="font-semibold">{questionText}</h4>
						<CaretSortIcon className="h-4 w-4"/>
						<span className="sr-only">Toggle</span>
					</Button>
				</CollapsibleTrigger>
				<CollapsibleContent className="space-y-2 ml-3">
					<InputComponent
						onValueChange={onValueChange}
						required={required}
						maxLength={maxLength}
						questionId={questionId}
					/>
				</CollapsibleContent>
			</div>
		</Collapsible>
	);
};

function GrantSection({ description, name, questions, sectionId }: Section) {
	const [answers, setAnswers] = useState<Record<number, unknown>>({});

	const handleValueChange = (questionId: number, value: unknown) => {
		setAnswers((prev) => ({ ...prev, [questionId]: value }));
	};

	const isDependencyMet = (dependsOn?: number | number[] | null): boolean => {
		if (!dependsOn) {
			return true;
		}
		if (Array.isArray(dependsOn)) {
			return dependsOn.map(Number).every((id) => !!answers[id]);
		}
		return !!answers[Number(dependsOn)];
	};

	return (
		<Card className="mb-6" data-testid={`grant-section-${sectionId}`}>
			<CardHeader>
				<CardTitle>{titleize(underscore(name).replace("_", " "))}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="border-2 rounded p-2">
				{questions.map((question) => (
					<Question
						key={question.questionId}
						{...question}
						onValueChange={(value) => {
							handleValueChange(question.questionId, value);
						}}
						dependencyMet={isDependencyMet(question.dependsOn)}
					/>
				))}
				</div>
			</CardContent>
		</Card>
	);
}

export function GrantApplication({ sections }: { sections: Section[] }) {
	return (
		<div className="w-full">
			{sections.map(({ sectionId, name, description, questions }) => (
				<GrantSection
					key={sectionId}
					sectionId={sectionId}
					name={name}
					description={description}
					questions={questions}
				/>
			))}
			<Button type="submit">Submit Application</Button>
		</div>
	);
}
