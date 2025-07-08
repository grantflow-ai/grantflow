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
 * Formats time remaining until deadline in weeks and days format
 * @param diffTime Time difference in milliseconds
 * @returns Formatted string like "2 weeks and 3 days to the deadline"
 */
export function formatTimeRemaining(diffTime: number): string {
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	const weeks = Math.floor(diffDays / 7);
	const days = diffDays % 7;

	if (weeks > 0 && days > 0) {
		return `${weeks} week${weeks === 1 ? "" : "s"} and ${days} day${days === 1 ? "" : "s"} to the deadline`;
	}
	if (weeks > 0) {
		return `${weeks} week${weeks === 1 ? "" : "s"} to the deadline`;
	}
	return `${days} day${days === 1 ? "" : "s"} to the deadline`;
}

/**
 * Gets the time remaining for a deadline or appropriate message
 * @param submissionDate ISO string date of the submission deadline (optional)
 * @returns Formatted time remaining string or appropriate message
 */
export function getTimeRemaining(submissionDate?: string): string {
	if (!submissionDate) {
		return "Deadline not set";
	}

	const diffTime = calculateTimeDifference(submissionDate);

	if (diffTime <= 0) {
		const deadline = new Date(submissionDate);
		const formattedDate = format(deadline, "MM/dd/yyyy");
		return `Deadline passed (${formattedDate})`;
	}

	return formatTimeRemaining(diffTime);
}
