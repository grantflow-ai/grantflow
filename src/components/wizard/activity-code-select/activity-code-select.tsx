import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "gen/ui/select";
import NIHActivityCodeData from "./nih-activity-codes.json";

interface ActivityCodeRecord {
	id: number;
	category: string;
	code: string;
	title: string;
	description: string;
	url?: string;
}

export const SupportedActivityCodes = new Set([
	"R01",
	"R03",
	"R18",
	"R21",
	"R24",
	"R25",
	"R33",
	"R34",
	"R35",
	"R41",
	"R42",
	"R43",
	"R44",
	"R50",
	"R61",
]);

const activityCodeData = (NIHActivityCodeData as ActivityCodeRecord[]).filter((record) =>
	SupportedActivityCodes.has(record.code),
);

export function ActivityCodeSelect() {
	return (
		<div data-testid="activity-code-select-container">
			<Select>
				<SelectTrigger>
					<SelectValue
						placeholder="Select an NIH Activity Code"
						data-testid="activity-code-select-placeholder"
						className="p-2"
					/>
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{activityCodeData.map((record) => (
							<SelectItem key={record.id} value={record.code} data-testid={`activity-code-select-item-${record.code}`}>
								{`(${record.code}) ${record.title}`}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}
