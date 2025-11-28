export interface LogLayerLike {
	debug(message: string): void;
	error(message: string): void;
	errorOnly(error: Error): void;
	info(message: string): void;
	metadataOnly(metadata: Record<string, unknown>): void;
	warn(message: string): void;
	withContext(context: Record<string, unknown>): LogLayerLike;
	withError(error: Error): LogLayerLike;
	withMetadata(metadata: Record<string, unknown>): LogLayerLike;
}
