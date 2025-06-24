import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { FileCard, FilesDisplay } from "./files-display";

const meta: Meta<typeof FilesDisplay> = {
	component: FilesDisplay,
	parameters: {
		layout: "centered",
	},
	title: "Components/FilesDisplay",
};

export default meta;
type Story = StoryObj<typeof FilesDisplay>;

// Helper function to create mock File objects
const createMockFile = (name: string, size: number, type: string): File => {
	// Create a blob with content of the specified size
	const content = Array.from({ length: size }, () => "a").join("");
	const blob = new Blob([content], { type });
	return new File([blob], name, { lastModified: Date.now(), type });
};

export const EmptyState: Story = {
	args: {
		files: [],
		onFileRemoved: action("file-removed"),
	},
};

export const SingleFile: Story = {
	args: {
		files: [createMockFile("research-proposal.pdf", 2_048_000, "application/pdf")],
		onFileRemoved: action("file-removed"),
	},
};

export const MultipleFiles: Story = {
	args: {
		files: [
			createMockFile("research-proposal.pdf", 2_048_000, "application/pdf"),
			createMockFile("budget-spreadsheet.xlsx", 512_000, "application/vnd.ms-excel"),
			createMockFile("team-bios.docx", 1_024_000, "application/msword"),
		],
		onFileRemoved: action("file-removed"),
	},
};

export const ManyFiles: Story = {
	args: {
		files: [
			createMockFile("research-proposal.pdf", 2_048_000, "application/pdf"),
			createMockFile("budget-spreadsheet.xlsx", 512_000, "application/vnd.ms-excel"),
			createMockFile("team-bios.docx", 1_024_000, "application/msword"),
			createMockFile("appendix-a.pdf", 768_000, "application/pdf"),
			createMockFile("appendix-b.pdf", 456_000, "application/pdf"),
			createMockFile("references.txt", 12_000, "text/plain"),
			createMockFile("data-analysis.csv", 345_600, "text/csv"),
			createMockFile("methodology.pdf", 890_000, "application/pdf"),
		],
		onFileRemoved: action("file-removed"),
	},
	name: "Many Files (Scrollable)",
};

export const LongFileNames: Story = {
	args: {
		files: [
			createMockFile(
				"very-long-filename-that-should-be-truncated-in-the-display-component.pdf",
				1_024_000,
				"application/pdf",
			),
			createMockFile(
				"another-extremely-long-filename-with-lots-of-words-and-hyphens.docx",
				512_000,
				"application/msword",
			),
			createMockFile("short.txt", 1000, "text/plain"),
		],
		onFileRemoved: action("file-removed"),
	},
};

export const VariousFileSizes: Story = {
	args: {
		files: [
			createMockFile("tiny.txt", 500, "text/plain"),
			createMockFile("small.pdf", 50_000, "application/pdf"),
			createMockFile("medium.docx", 500_000, "application/msword"),
			createMockFile("large.zip", 5_000_000, "application/zip"),
			createMockFile("huge.mp4", 50_000_000, "video/mp4"),
		],
		onFileRemoved: action("file-removed"),
	},
};

export const DuplicateNames: Story = {
	args: {
		files: [
			createMockFile("document.pdf", 1_024_000, "application/pdf"),
			createMockFile("document.pdf", 2_048_000, "application/pdf"),
			createMockFile("document.pdf", 512_000, "application/pdf"),
		],
		onFileRemoved: action("file-removed"),
	},
	name: "Files with Duplicate Names",
};

// Story for individual FileCard component
export const IndividualFileCard: Story = {
	name: "Individual File Cards",
	render: () => (
		<div className="w-96 space-y-4">
			<FileCard
				file={createMockFile("sample-document.pdf", 1_024_000, "application/pdf")}
				handleRemoveFile={action("remove-file")}
			/>
			<FileCard
				file={createMockFile("large-video-file.mp4", 150_000_000, "video/mp4")}
				handleRemoveFile={action("remove-file")}
			/>
			<FileCard
				file={createMockFile(
					"file-with-an-extremely-long-name-that-should-be-truncated.docx",
					2_048_000,
					"application/msword",
				)}
				handleRemoveFile={action("remove-file")}
			/>
		</div>
	),
};

export const SpecialCharacters: Story = {
	args: {
		files: [
			createMockFile("file & document.pdf", 1_024_000, "application/pdf"),
			createMockFile("résumé (final).docx", 512_000, "application/msword"),
			createMockFile("<important>.txt", 10_000, "text/plain"),
			createMockFile("data [2024].csv", 345_600, "text/csv"),
		],
		onFileRemoved: action("file-removed"),
	},
	name: "Files with Special Characters",
};

// Import useState for the interactive demo
import { useState } from "react";

export const InteractiveDemo: Story = {
	render: function InteractiveFileRemoval() {
		const [files, setFiles] = useState<File[]>([
			createMockFile("document-1.pdf", 1_024_000, "application/pdf"),
			createMockFile("spreadsheet.xlsx", 512_000, "application/vnd.ms-excel"),
			createMockFile("presentation.pptx", 2_048_000, "application/vnd.ms-powerpoint"),
		]);

		const handleFileRemoved = (fileToRemove: File) => {
			setFiles(files.filter((file) => file !== fileToRemove));
			action("file-removed")(fileToRemove);
		};

		return (
			<div className="space-y-4">
				<div className="text-muted-foreground text-sm">Click the X button to remove files from the list</div>
				<FilesDisplay files={files} onFileRemoved={handleFileRemoved} />
				{files.length === 0 && (
					<div className="text-muted-foreground rounded-md border p-4 text-center">
						All files have been removed
					</div>
				)}
			</div>
		);
	},
};
