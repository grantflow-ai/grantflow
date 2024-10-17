import { Label } from "gen/ui/label";
import { Input } from "gen/ui/input";
import { Checkbox } from "gen/ui/checkbox";
import { cn } from "gen/cn";

export function GeneralInformationForm({
	title,
	isResubmission,
	setTitle,
	setIsResubmission,
}: {
	title: string;
	isResubmission: boolean;
	setTitle: (title: string) => void;
	setIsResubmission: (isResubmission: boolean) => void;
}) {
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<Label htmlFor="title-input" className="text-sm font-medium text-foreground">
					Grant Application Title
				</Label>
				<Input
					id="title-input"
					placeholder="Enter the Grant Application Title"
					minLength={25}
					maxLength={255}
					value={title}
					onChange={(e) => {
						if (e.target.value.length <= 255) {
							setTitle(e.target.value);
						}
					}}
					className="transition-all duration-200 focus:ring-2 focus:ring-primary"
				/>
				{title ? (
					<p
						className={cn(
							"text-xs text-muted-foreground transition-colors duration-200",
							title.length < 25 && "text-red-500",
							title.length >= 25 && title.length <= 255 && "text-green-500",
						)}
					>
						{title.length}/255 characters {title.length < 25 ? `(${25 - title.length} more required)` : ""}
					</p>
				) : null}
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox
					id="resubmission-checkbox"
					checked={isResubmission}
					onCheckedChange={(checked) => {
						setIsResubmission(checked as boolean);
					}}
					className="h-5 w-5 transition-all duration-200 focus:ring-2 focus:ring-primary"
				/>
				<Label
					htmlFor="resubmission-checkbox"
					className="text-sm font-medium text-foreground cursor-pointer select-none"
				>
					This is a Re-Submission
				</Label>
			</div>
		</div>
	);
}
