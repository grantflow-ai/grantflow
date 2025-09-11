export function LoadingState() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen gap-4">
			<div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary" />
			<p className="text-app-gray-600 font-medium">Loading...</p>
		</div>
	);
}
