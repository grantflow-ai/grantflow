import { Plus, Trash2 } from "lucide-react";
import { Button } from "gen/ui/button";
import { Input } from "gen/ui/input";
import { Textarea } from "gen/ui/textarea";
import { Checkbox } from "gen/ui/checkbox";
import { Label } from "gen/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
import { FileUploadContainer } from "@/components/file-upload-container";
import { useWizardStore } from "@/stores/wizard";
import { useShallow } from "zustand/react/shallow";
import { NewResearchAim, NewResearchTask } from "@/types/database-types";
import { uploadFiles } from "@/actions/file";

export function ResearchAimsForm({
	workspaceId,
	applicationId,
	onPressPrevious,
	onPressNext,
}: {
	workspaceId: string;
	applicationId: string;
	onPressNext: () => void;
	onPressPrevious: () => void;
}) {
	const {
		addResearchAim,
		addResearchTask,
		removeResearchAim,
		removeResearchTask,
		researchAims,
		researchTasks,
		updateResearchAim,
		updateResearchTask,
		loading,
	} = useWizardStore({ workspaceId })(
		useShallow((state) => ({
			addResearchAim: state.addResearchAim,
			addResearchTask: state.addResearchTask,
			removeResearchAim: state.removeResearchAim,
			removeResearchTask: state.removeResearchTask,
			researchAims: state.researchAims,
			researchTasks: state.researchTasks,
			updateResearchAim: state.updateResearchAim,
			updateResearchTask: state.updateResearchTask,
			loading: state.loading,
		})),
	);

	return (
		<div className="space-y-6">
			{researchAims.map((aim, aimIndex) => (
				<Card key={aim.id} className="p-6">
					<CardHeader>
						<CardTitle>Research Aim {aimIndex + 1}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor={`aim-title-${aim.id}`}>Title (min 3 characters)</Label>
							<Input
								id={`aim-title-${aim.id}`}
								value={aim.title}
								onChange={async (e) => {
									await updateResearchAim(aim.id, { title: e.target.value });
								}}
								minLength={3}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`aim-description-${aim.id}`}>Description</Label>
							<Textarea
								id={`aim-description-${aim.id}`}
								value={aim.description}
								onChange={async (e) => {
									await updateResearchAim(aim.id, { description: e.target.value });
								}}
								required
							/>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox
								id={`aim-clinical-trials-${aim.id}`}
								checked={aim.requiresClinicalTrials}
								onCheckedChange={async (checked) => {
									await updateResearchAim(aim.id, { requiresClinicalTrials: checked as boolean });
								}}
							/>
							<Label htmlFor={`aim-clinical-trials-${aim.id}`}>Requires Clinical Trials</Label>
						</div>
						<div className="space-y-2">
							<FileUploadContainer
								setFileData={async (fileData) => {
									const files = await uploadFiles({
										workspaceId,
										parentId: aim.id,
										files: fileData,
									});
									await updateResearchAim(aim.id, { files });
								}}
							/>
						</div>
						<div className="space-y-4">
							<h4 className="font-medium">Research Tasks</h4>
							{researchTasks
								.filter((task) => task.aimId === aim.id)
								.map((task, taskIndex) => (
									<Card key={task.id} className="p-4">
										<CardHeader>
											<CardTitle className="text-lg">Task {taskIndex + 1}</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="space-y-2">
												<Label htmlFor={`task-title-${task.id}`}>
													Title (min 3 characters)
												</Label>
												<Input
													id={`task-title-${task.id}`}
													value={task.title}
													onChange={async (e) => {
														await updateResearchTask(task.id, { title: e.target.value });
													}}
													minLength={3}
													required
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor={`task-description-${task.id}`}>Description</Label>
												<Textarea
													id={`task-description-${task.id}`}
													value={task.description}
													onChange={async (e) => {
														await updateResearchTask(task.id, {
															description: e.target.value,
														});
													}}
													required
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor={`task-files-${task.id}`}>Upload Files</Label>
												<div className="flex items-center space-x-2">
													<FileUploadContainer
														setFileData={async (fileData) => {
															const files = await uploadFiles({
																workspaceId,
																parentId: task.id,
																files: fileData,
															});

															await updateResearchTask(task.id, {
																files,
															});
														}}
													/>
												</div>
											</div>
											{researchTasks.filter((t) => t.aimId === aim.id).length > 1 && (
												<Button
													type="button"
													variant="destructive"
													size="sm"
													disabled={loading}
													onClick={async () => {
														await removeResearchTask(task.id);
													}}
												>
													<Trash2 className="w-4 h-4 mr-2" />
													Remove Task
												</Button>
											)}
										</CardContent>
									</Card>
								))}
							<Button
								type="button"
								variant="outline"
								disabled={loading}
								onClick={async () => {
									await addResearchTask({
										aimId: aim.id,
										title: "",
										description: "",
									} satisfies NewResearchTask);
								}}
							>
								<Plus className="w-4 h-4 mr-2" />
								Add Research Task
							</Button>
						</div>
						{researchAims.length > 1 && (
							<Button
								type="button"
								variant="destructive"
								disabled={loading}
								onClick={async () => {
									await removeResearchAim(aim.id);
								}}
							>
								<Trash2 className="w-4 h-4 mr-2" />
								Remove Research Aim
							</Button>
						)}
					</CardContent>
				</Card>
			))}
			<div className="flex justify-start">
				<Button
					type="button"
					variant="outline"
					disabled={loading}
					onClick={async () => {
						await addResearchAim({
							applicationId,
							title: "",
							description: "",
							requiresClinicalTrials: false,
						} satisfies NewResearchAim);
					}}
				>
					<Plus className="w-4 h-4 mr-2" />
					Add Research Aim
				</Button>
			</div>
			<div className="pt-10 flex justify-between">
				<Button onClick={onPressPrevious} aria-label="Go Back">
					Go Back
				</Button>
				<Button
					onClick={onPressNext}
					disabled={loading}
					data-testid="significance-innovation-form-submit"
					aria-disabled={loading}
					aria-label={loading ? "Saving changes..." : "Save changes"}
				>
					Continue
				</Button>
			</div>
		</div>
	);
}
