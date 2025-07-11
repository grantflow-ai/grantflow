import { format } from "date-fns";

/**
 * Calculates the time difference between now and a submission date
 * @param submittedDate ISO string date of the submission deadline
 * @returns Time difference in milliseconds (negative if deadline has passed)
 */
export function calculateTimeDifference(submittedDate: string): number {
	const now = new Date();
	const deadline = new Date(submittedDate);
	return deadline.getTime() - now.getTime();
}

/**
 * Gets deadline status and time breakdown information
 * @param submissionDate ISO string date of the submission deadline (optional)
 * @returns Object with deadline status and time information
 */
export function getDeadlineInfo(submissionDate?: string): {
	formattedDate?: string;
	status: "active" | "not_set" | "passed";
	timeBreakdown?: { days: number; totalDays: number; weeks: number };
} {
	if (!submissionDate) {
		return { status: "not_set" };
	}

	const diffTime = calculateTimeDifference(submissionDate);

	if (diffTime <= 0) {
		const deadline = new Date(submissionDate);
		const formattedDate = format(deadline, "MM/dd/yyyy");
		return { formattedDate, status: "passed" };
	}

	const timeBreakdown = getTimeBreakdown(diffTime);
	return { status: "active", timeBreakdown };
}

/**
 * Converts time difference to weeks and days breakdown
 * @param diffTime Time difference in milliseconds
 * @returns Object containing week and days breakdown
 */
export function getTimeBreakdown(diffTime: number): { days: number; totalDays: number; weeks: number } {
	const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	const weeks = Math.floor(totalDays / 7);
	const days = totalDays % 7;

	return { days, totalDays, weeks };
}
