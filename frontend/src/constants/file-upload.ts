export const FILE_ACCEPTS = {
	"application/csv": [".csv"],
	"application/latex": [".latex"],
	"application/msword": [".doc"],
	"application/pdf": [".pdf"],
	"application/rtf": [".rtf"],
	"application/vnd.ms-powerpoint": [".ppt"],
	"application/vnd.oasis.opendocument.text": [".odt"],
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
	"text/csv": [".csv"],
	"text/latex": [".latex"],
	"text/markdown": [".md"],
	"text/plain": [".txt"],
	"text/rst": [".rst"],
	"text/rtf": [".rtf"],
} as const;

export const FILE_SIZE_MB = 100;
export const MAX_FILE_SIZE_BYTES = FILE_SIZE_MB * 1024 * 1024;
