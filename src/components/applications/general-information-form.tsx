import { Label } from "gen/ui/label";
import { Input } from "gen/ui/input";
import { Checkbox } from "gen/ui/checkbox";
import { cn } from "gen/cn";
import { useWizardStore } from "@/stores/wizard";
import { useShallow } from "zustand/react/shallow";

export function GeneralInformationForm({ workspaceId }: { workspaceId: string }) {
	const { application, updateApplication } = useWizardStore({ workspaceId })(
		useShallow((state) => ({
			application: state.application,
			updateApplication: state.updateApplication,
		})),
	);
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
					value={application?.title}
					onChange={async (e) => {
						if (e.target.value.length <= 255) {
							await updateApplication("title", e.target.value);
						}
					}}
					className="transition-all duration-200 focus:ring-2 focus:ring-primary"
				/>
				{application?.title ? (
					<p
						className={cn(
							"text-xs text-muted-foreground transition-colors duration-200",
							application.title.length < 25 && "text-red-500",
							application.title.length >= 25 && application.title.length <= 255 && "text-green-500",
						)}
					>
						{application.title.length}/255 characters{" "}
						{application.title.length < 25 ? `(${25 - application.title.length} more required)` : ""}
					</p>
				) : null}
			</div>
			<div className="flex items-center space-x-2">
				<Checkbox
					id="resubmission-checkbox"
					checked={application?.isResubmission}
					onCheckedChange={async (checked) => {
						await updateApplication("isResubmission", checked);
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
