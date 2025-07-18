import { CheckCircle, Clock, FileText, Link, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApplicationStore } from "@/stores/application-store";

const statusIcons = {
	CREATED: <Clock className="h-4 w-4 text-yellow-500" />,
	FAILED: <XCircle className="h-4 w-4 text-red-500" />,
	FINISHED: <CheckCircle className="h-4 w-4 text-green-500" />,
	INDEXING: <Clock className="h-4 w-4 text-blue-500 animate-spin" />,
};

const statusLabels = {
	CREATED: "Created",
	FAILED: "Failed",
	FINISHED: "Complete",
	INDEXING: "Processing",
};

const statusColors = {
	CREATED: "text-yellow-600 bg-yellow-50",
	FAILED: "text-red-600 bg-red-50",
	FINISHED: "text-green-600 bg-green-50",
	INDEXING: "text-blue-600 bg-blue-50",
};

export function RagSourcesContent() {
	const grantTemplate = useApplicationStore((state) => state.application?.grant_template);

	const ragSources = grantTemplate?.rag_sources ?? [];

	if (!grantTemplate) {
		return (
			<div className="space-y-4" data-testid="rag-sources-no-template">
				<p className="text-sm text-gray-600">No template found. Please create or reload the application.</p>
			</div>
		);
	}

	if (ragSources.length === 0) {
		return (
			<div className="space-y-4" data-testid="rag-sources-empty">
				<p className="text-sm text-gray-600">No documents or URLs have been added to the knowledge base yet.</p>
			</div>
		);
	}

	const groupedSources = ragSources.reduce(
		(acc, source) => {
			if (source.filename) {
				acc.files.push(source);
			} else if (source.url) {
				acc.urls.push(source);
			} else {
				acc.unknown.push(source);
			}
			return acc;
		},
		{ files: [] as typeof ragSources, unknown: [] as typeof ragSources, urls: [] as typeof ragSources },
	);

	const renderSourceItem = (source: (typeof ragSources)[0]) => {
		const displayName = source.filename ?? source.url ?? "Unknown source";
		const { status } = source;

		return (
			<div
				className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
				data-testid={`rag-source-${source.sourceId}`}
				key={source.sourceId}
			>
				<div className="flex items-center gap-3">
					{source.filename ? (
						<FileText className="h-5 w-5 text-gray-500" />
					) : (
						<Link className="h-5 w-5 text-gray-500" />
					)}
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
						{source.url && source.filename && (
							<p className="text-xs text-gray-500 truncate">{source.url}</p>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2">
					{statusIcons[status]}
					<span
						className={cn(
							"inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
							statusColors[status],
						)}
					>
						{statusLabels[status]}
					</span>
				</div>
			</div>
		);
	};

	return (
		<div className="space-y-4" data-testid="rag-sources-content">
			<div className="max-h-96 overflow-y-auto space-y-4" data-testid="rag-sources-list">
				{groupedSources.files.length > 0 && (
					<div data-testid="rag-sources-files">
						<h4 className="text-sm font-medium text-gray-900 mb-2">
							Documents ({groupedSources.files.length})
						</h4>
						<div className="space-y-2">{groupedSources.files.map(renderSourceItem)}</div>
					</div>
				)}

				{groupedSources.urls.length > 0 && (
					<div data-testid="rag-sources-urls">
						<h4 className="text-sm font-medium text-gray-900 mb-2">URLs ({groupedSources.urls.length})</h4>
						<div className="space-y-2">{groupedSources.urls.map(renderSourceItem)}</div>
					</div>
				)}

				{groupedSources.unknown.length > 0 && (
					<div data-testid="rag-sources-unknown">
						<h4 className="text-sm font-medium text-gray-900 mb-2">
							Unknown sources ({groupedSources.unknown.length})
						</h4>
						<div className="space-y-2">{groupedSources.unknown.map(renderSourceItem)}</div>
					</div>
				)}
			</div>

			<div className="pt-4 border-t">
				<div className="text-sm text-gray-500" data-testid="rag-sources-total">
					Total: {ragSources.length} source{ragSources.length === 1 ? "" : "s"}
				</div>
			</div>
		</div>
	);
}
