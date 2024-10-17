import { Plus, Trash2 } from "lucide-react";
import { Button } from "gen/ui/button";
import { Input } from "gen/ui/input";
import { Textarea } from "gen/ui/textarea";
import { Checkbox } from "gen/ui/checkbox";
import { Label } from "gen/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "gen/ui/card";
import { ResearchAim, ResearchTask } from "@/types/database-types";
import { FileUploadContainer } from "@/components/file-upload-container";

export type ResearchAimProp = Pick<ResearchAim, "id" | "title" | "description" | "requiresClinicalTrials" | "fileIds">;
export type ResearchTaskProp = Pick<ResearchTask, "id" | "title" | "description" | "fileIds" | "aimId">;

export function ResearchAimsForm({
	researchAims,
	researchTasks,
	setResearchAims,
	setResearchTasks,
}: {
	researchAims: ResearchAimProp[];
	researchTasks: ResearchTaskProp[];
	setResearchAims: (values: ResearchAimProp[]) => void;
	setResearchTasks: (values: ResearchTaskProp[]) => void;
}) {
	const addResearchAim = () => {
		const newAim: ResearchAimProp = {
			id: Date.now().toString(),
			title: "",
			description: "",
			requiresClinicalTrials: false,
			fileIds: [],
		};
		setResearchAims([...researchAims, newAim]);
	};

	const removeResearchAim = (aimId: string) => {
		setResearchAims(researchAims.filter((aim) => aim.id !== aimId));
		setResearchTasks(researchTasks.filter((task) => task.aimId !== aimId));
	};

	const addResearchTask = (aimId: string) => {
		const newTask: ResearchTaskProp = {
			id: Date.now().toString(),
			title: "",
			description: "",
			fileIds: [],
			aimId,
		};
		setResearchTasks([...researchTasks, newTask]);
	};

	const removeResearchTask = (taskId: string) => {
		setResearchTasks(researchTasks.filter((task) => task.id !== taskId));
	};

	const handleAimChange = (aimId: string, field: keyof ResearchAimProp, value: string | boolean) => {
		setResearchAims(researchAims.map((aim) => (aim.id === aimId ? { ...aim, [field]: value } : aim)));
	};

	const handleTaskChange = (taskId: string, field: keyof ResearchTaskProp, value: string) => {
		setResearchTasks(researchTasks.map((task) => (task.id === taskId ? { ...task, [field]: value } : task)));
	};

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
								onChange={(e) => {
									handleAimChange(aim.id, "title", e.target.value);
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
								onChange={(e) => {
									handleAimChange(aim.id, "description", e.target.value);
								}}
								required
							/>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox
								id={`aim-clinical-trials-${aim.id}`}
								checked={aim.requiresClinicalTrials}
								onCheckedChange={(checked) => {
									handleAimChange(aim.id, "requiresClinicalTrials", checked as boolean);
								}}
							/>
							<Label htmlFor={`aim-clinical-trials-${aim.id}`}>Requires Clinical Trials</Label>
						</div>
						<div className="space-y-2">
							<FileUploadContainer
								parentId={aim.id}
								setFileData={(fileData) => {
									setResearchAims(
										researchAims.map((a) => {
											if (a.id === aim.id) {
												return { ...a, fileIds: fileData.map((file) => file.fileId) };
											}
											return a;
										}),
									);
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
													onChange={(e) => {
														handleTaskChange(task.id, "title", e.target.value);
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
													onChange={(e) => {
														handleTaskChange(task.id, "description", e.target.value);
													}}
													required
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor={`task-files-${task.id}`}>Upload Files</Label>
												<div className="flex items-center space-x-2">
													<FileUploadContainer
														parentId={task.id}
														setFileData={(fileData) => {
															setResearchTasks(
																researchTasks.map((t) => {
																	if (t.id === task.id) {
																		return {
																			...t,
																			fileIds: fileData.map(
																				(file) => file.fileId,
																			),
																		};
																	}
																	return t;
																}),
															);
														}}
													/>
												</div>
											</div>
											{researchTasks.filter((t) => t.aimId === aim.id).length > 1 && (
												<Button
													type="button"
													variant="destructive"
													size="sm"
													onClick={() => {
														removeResearchTask(task.id);
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
								onClick={() => {
									addResearchTask(aim.id);
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
								onClick={() => {
									removeResearchAim(aim.id);
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
				<Button type="button" variant="outline" onClick={addResearchAim}>
					<Plus className="w-4 h-4 mr-2" />
					Add Research Aim
				</Button>
			</div>
		</div>
	);
}
