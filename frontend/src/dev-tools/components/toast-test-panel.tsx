import { toast } from "sonner";

interface ToastTestPanelProps {
	enabled: boolean;
	onToggle: (enabled: boolean) => void;
}

export function ToastTestPanel({ enabled, onToggle }: ToastTestPanelProps) {
	return (
		<div className="space-y-6">
			<h3 className="text-lg font-semibold">Toast Testing</h3>
			<div className="space-y-4">
				<div className="flex items-center justify-between rounded-lg bg-gray-800 p-4">
					<div>
						<h4 className="font-medium">Toast Test Button</h4>
						<p className="text-sm text-gray-400">Enable a floating button to test toast notifications</p>
					</div>
					<button
						className={`relative h-6 w-11 rounded-full transition-colors ${
							enabled ? "bg-purple-600" : "bg-gray-600"
						}`}
						onClick={() => {
							onToggle(!enabled);
						}}
						type="button"
					>
						<span
							className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
								enabled ? "translate-x-5" : "translate-x-0.5"
							}`}
						/>
					</button>
				</div>
				{enabled && (
					<div className="rounded-lg bg-gray-800 p-4">
						<h4 className="mb-3 font-medium">Test Different Toast Types</h4>
						<div className="grid gap-2 md:grid-cols-2">
							<button
								className="rounded bg-green-600 px-4 py-2 text-sm hover:bg-green-700"
								onClick={() => toast.success("Success! This is a test success message.")}
								type="button"
							>
								Success Toast
							</button>
							<button
								className="rounded bg-red-600 px-4 py-2 text-sm hover:bg-red-700"
								onClick={() => toast.error("Error! This is a test error message.")}
								type="button"
							>
								Error Toast
							</button>
							<button
								className="rounded bg-blue-600 px-4 py-2 text-sm hover:bg-blue-700"
								onClick={() => toast.info("Info! This is a test info message.")}
								type="button"
							>
								Info Toast
							</button>
							<button
								className="rounded bg-amber-600 px-4 py-2 text-sm hover:bg-amber-700"
								onClick={() => toast.warning("Warning! This is a test warning message.")}
								type="button"
							>
								Warning Toast
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
