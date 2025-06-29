"use client";

import { FormInputsFactory, RagSourceFactory, ResearchObjectiveFactory } from "::testing/factories";
import { CheckCircle, FileText, Loader, Upload } from "lucide-react";
import { useApplicationStore } from "@/stores/application-store";

export function ApplicationTools() {
	const application = useApplicationStore((state) => state.application);
	const changeApplicationStatus = (status: "CANCELLED" | "COMPLETED" | "DRAFT" | "IN_PROGRESS") => {
		if (!application) return;
		// Mock updating application status directly (dev-only)
		useApplicationStore.setState({
			application: {
				...application,
				status,
				...(status === "COMPLETED" ? { completed_at: new Date().toISOString() } : {}),
			},
		});
		console.log(`[Dev Tools] Changed application status to: ${status}`);
	};

	const addMockSources = () => {
		if (!application) return;
		const mockSources = RagSourceFactory.batch(5);
		// Mock updating rag sources directly (dev-only)
		useApplicationStore.setState({
			application: {
				...application,
				rag_sources: [...(application.rag_sources ?? []), ...mockSources],
			},
		});
		console.log("[Dev Tools] Added 5 mock RAG sources");
	};

	const simulateProcessing = () => {
		// Simulate file processing states
		const sources = application?.rag_sources ?? [];
		sources.forEach((source, index) => {
			const startIndexing = () => {
				const updatedSources = [...sources];
				updatedSources[index] = { ...source, status: "INDEXING" };
				// Mock updating rag sources directly (dev-only)
				useApplicationStore.setState({
					application: application ? { ...application, rag_sources: updatedSources } : null,
				});

				const finishIndexing = () => {
					updatedSources[index] = { ...source, status: "FINISHED" };
					// Mock updating rag sources directly (dev-only)
					useApplicationStore.setState({
						application: application ? { ...application, rag_sources: updatedSources } : null,
					});
				};

				setTimeout(finishIndexing, 2000);
			};

			setTimeout(startIndexing, index * 1000);
		});
		console.log("[Dev Tools] Started source processing simulation");
	};

	const populateFormData = () => {
		const mockFormInputs = FormInputsFactory.build();
		const mockObjectives = ResearchObjectiveFactory.batch(3);

		// Mock updating form data directly (dev-only)
		if (application) {
			useApplicationStore.setState({
				application: {
					...application,
					form_inputs: mockFormInputs,
					research_objectives: mockObjectives,
				},
			});
		}
		console.log("[Dev Tools] Populated form data and objectives");
	};

	return (
		<div className="space-y-4">
			<h4 className="font-medium">Application Tools</h4>

			{application && (
				<div className="rounded bg-gray-700 p-3">
					<p className="text-sm">
						Application: <span className="font-bold text-purple-400">{application.title}</span>
					</p>
					<p className="text-sm">
						Status: <span className="font-bold text-green-400">{application.status}</span>
					</p>
					<p className="text-sm">
						Sources: <span className="font-bold">{application.rag_sources?.length ?? 0}</span>
					</p>
				</div>
			)}

			<div className="grid gap-3 md:grid-cols-2">
				<button
					className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm hover:bg-blue-700"
					onClick={addMockSources}
					type="button"
				>
					<Upload className="h-4 w-4" />
					Add Mock Sources
				</button>

				<button
					className="flex items-center gap-2 rounded bg-yellow-600 px-4 py-2 text-sm hover:bg-yellow-700"
					onClick={simulateProcessing}
					type="button"
				>
					<Loader className="h-4 w-4" />
					Simulate Processing
				</button>

				<button
					className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm hover:bg-green-700"
					onClick={populateFormData}
					type="button"
				>
					<FileText className="h-4 w-4" />
					Populate Form Data
				</button>

				<button
					className="flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-700"
					onClick={() => {
						changeApplicationStatus("COMPLETED");
					}}
					type="button"
				>
					<CheckCircle className="h-4 w-4" />
					Mark Complete
				</button>
			</div>

			<div className="space-y-2">
				<p className="text-sm font-medium">Change Status:</p>
				<div className="flex gap-2">
					{(["DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map((status) => (
						<button
							className={`rounded px-3 py-1 text-xs ${
								application?.status === status
									? "bg-purple-600 text-white"
									: "bg-gray-700 text-gray-300 hover:bg-gray-600"
							}`}
							key={status}
							onClick={() => {
								changeApplicationStatus(status);
							}}
							type="button"
						>
							{status}
						</button>
					))}
				</div>
			</div>

			<div className="mt-4 rounded bg-gray-700 p-3">
				<p className="text-xs text-gray-400">
					💡 Tip: Use &quot;Simulate Processing&quot; to test the file indexing UI animations.
				</p>
			</div>
		</div>
	);
}
