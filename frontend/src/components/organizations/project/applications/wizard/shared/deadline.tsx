import Image from "next/image";
import { useApplicationStore } from "@/stores/application-store";
import { getDeadlineInfo } from "@/utils/date-time";

function TimeUnit({ unit, value }: { unit: "day" | "week"; value: number }) {
	return (
		<span>
			<span className="font-semibold">{value}</span> {unit}
			{value === 1 ? "" : "s"}
		</span>
	);
}

const formatDeadlineDisplay = (weeks: number, days: number): React.ReactElement<"span"> => {
	if (weeks > 0 && days > 0) {
		return (
			<span>
				<TimeUnit unit="week" value={weeks} /> and <TimeUnit unit="day" value={days} />
			</span>
		);
	}
	if (weeks > 0) {
		return <TimeUnit unit="week" value={weeks} />;
	}
	return <TimeUnit unit="day" value={days} />;
};

const getDeadlineText = (deadlineInfo: ReturnType<typeof getDeadlineInfo>): React.ReactElement<"span"> => {
	switch (deadlineInfo.status) {
		case "active": {
			if (deadlineInfo.timeBreakdown) {
				const { days, weeks } = deadlineInfo.timeBreakdown;
				return <span>{formatDeadlineDisplay(weeks, days)} to the deadline</span>;
			}
			return <span>Deadline not set</span>;
		}
		case "not_set": {
			return <span>Deadline not set</span>;
		}
		case "passed": {
			return <span>Deadline passed ({deadlineInfo.formattedDate})</span>;
		}
		default: {
			return <span>Deadline not set</span>;
		}
	}
};

export function Deadline() {
	const submissionDate = useApplicationStore((state) => state.application?.grant_template?.submission_date);

	const deadlineInfo = getDeadlineInfo(submissionDate);

	return (
		<div
			className="rounded-xs bg-app-lavender-gray relative box-border flex w-full flex-row items-center justify-center gap-0.5 px-2 py-1 text-sm text-app-black"
			data-testid="deadline-component"
		>
			<Image alt="Deadline" height={16} src="/icons/deadline.svg" width={16} />
			<div className="leading-none">{getDeadlineText(deadlineInfo)}</div>
		</div>
	);
}
