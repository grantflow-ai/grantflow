export interface FileWithId extends File {
	id: string;
}

export type FileWithSource = {
	sourceId: string;
	sourceStatus: string;
} & FileWithId;

export interface UrlWithSource {
	sourceId: string;
	sourceStatus: string;
	url: string;
}
