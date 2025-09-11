import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { action } from "storybook/actions";
import { useApplicationStore } from "@/stores/application-store";
import type { FileWithId } from "@/types/files";
import { FilePreviewCard } from "./file-preview-card";

const meta: Meta<typeof FilePreviewCard> = {
	component: FilePreviewCard,
	decorators: [
		(Story) => (
			<div className="bg-gray-50 p-8">
				<div className="grid max-w-4xl grid-cols-4 gap-4">
					<Story />
				</div>
			</div>
		),
	],
	parameters: {
		layout: "centered",
	},
	title: "Wizard/Components/FilePreviewCard",
};

export default meta;
type Story = StoryObj<typeof FilePreviewCard>;

const createMockFile = (name: string, type = "application/pdf"): FileWithId => {
	const file = new File(["mock content"], name, { type });
	return Object.assign(file, { id: crypto.randomUUID() });
};

export const PdfFile: Story = {
	args: {
		file: createMockFile("research-proposal.pdf"),
		parentId: "template-123",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					removeFile: (...args) => {
						action("remove-file")(...args);
						return Promise.resolve();
					},
				});
			}, []);
			return <Story />;
		},
	],
};

export const DocxFile: Story = {
	args: {
		file: createMockFile(
			"application-guidelines.docx",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		),
		parentId: "template-123",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					removeFile: (...args) => {
						action("remove-file")(...args);
						return Promise.resolve();
					},
				});
			}, []);
			return <Story />;
		},
	],
};

export const CsvFile: Story = {
	args: {
		file: createMockFile("budget-data.csv", "text/csv"),
		parentId: "template-123",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					removeFile: (...args) => {
						action("remove-file")(...args);
						return Promise.resolve();
					},
				});
			}, []);
			return <Story />;
		},
	],
};

export const MarkdownFile: Story = {
	args: {
		file: createMockFile("README.md", "text/markdown"),
		parentId: "template-123",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					removeFile: (...args) => {
						action("remove-file")(...args);
						return Promise.resolve();
					},
				});
			}, []);
			return <Story />;
		},
	],
};

export const PowerPointFile: Story = {
	args: {
		file: createMockFile(
			"presentation.pptx",
			"application/vnd.openxmlformats-officedocument.presentationml.presentation",
		),
		parentId: "template-123",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					removeFile: (...args) => {
						action("remove-file")(...args);
						return Promise.resolve();
					},
				});
			}, []);
			return <Story />;
		},
	],
};

export const GeneralFileTypes: Story = {
	decorators: [
		() => {
			useEffect(() => {
				useApplicationStore.setState({
					removeFile: (...args) => {
						action("remove-file")(...args);
						return Promise.resolve();
					},
				});
			}, []);

			const generalFiles = [
				createMockFile("document.latex", "application/x-latex"),
				createMockFile("text.odt", "application/vnd.oasis.opendocument.text"),
				createMockFile("readme.rst", "text/x-rst"),
				createMockFile("notes.rtf", "application/rtf"),
				createMockFile("data.txt", "text/plain"),
				createMockFile("spreadsheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
			];

			return (
				<div>
					{generalFiles.map((file) => (
						<FilePreviewCard file={file} key={file.id} parentId="template-123" />
					))}
				</div>
			);
		},
	],
	name: "General File Types (use file-general.svg)",
	parameters: {
		layout: "fullscreen",
	},
};

export const LongFileName: Story = {
	args: {
		file: createMockFile("very-long-filename-that-should-be-truncated-in-the-display.pdf"),
		parentId: "template-123",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					removeFile: (...args) => {
						action("remove-file")(...args);
						return Promise.resolve();
					},
				});
			}, []);
			return <Story />;
		},
	],
};

export const WithoutParentId: Story = {
	args: {
		file: createMockFile("no-parent-id.pdf"),
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					removeFile: (...args) => {
						action("remove-file")(...args);
						return Promise.resolve();
					},
				});
			}, []);
			return <Story />;
		},
	],
	name: "Without Parent ID (Remove Disabled)",
};

export const MultipleFiles: Story = {
	decorators: [
		() => {
			useEffect(() => {
				useApplicationStore.setState({
					removeFile: (...args) => {
						action("remove-file")(...args);
						return Promise.resolve();
					},
				});
			}, []);

			const files = [
				createMockFile("proposal.pdf"),
				createMockFile("budget.xlsx"),
				createMockFile("team.docx"),
				createMockFile("timeline.pptx"),
				createMockFile("references.csv"),
				createMockFile("notes.md"),
			];

			return (
				<div>
					{files.map((file) => (
						<FilePreviewCard file={file} key={file.id} parentId="template-123" />
					))}
				</div>
			);
		},
	],
	parameters: {
		layout: "fullscreen",
	},
};
