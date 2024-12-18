"use client";

import React, { useContext } from "react";

import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";

import { useEditorRef } from "@udecode/plate-common/react";
import { ArrowDownToLineIcon } from "lucide-react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
	useOpenState,
} from "./dropdown-menu";
import { ToolbarButton } from "./toolbar";
import { TPlateEditor } from "@udecode/plate-core/react";
import { MarkdownPlugin } from "@udecode/plate-markdown";
import { ApplicationContext } from "@/components/workspaces/detail/applications/detail/context";

export function ExportToolbarButton({ children, ...props }: DropdownMenuProps) {
	const editor = useEditorRef<TPlateEditor<any, typeof MarkdownPlugin>>();
	const openState = useOpenState();
	const application = useContext(ApplicationContext);

	const getFileName = (extension: string) => {
		const title = application?.title ?? "grantflow-doc";
		const sanitizedTitle = title.replace(/[^\w\s-]/g, "-").trim();

		return `${sanitizedTitle}.${extension}`;
	};

	const downloadFile = (href: string, filename: string) => {
		const element = document.createElement("a");
		element.setAttribute("href", href);
		element.setAttribute("download", filename);
		element.style.display = "none";
		document.body.append(element);
		element.click();
		element.remove();
	};

	const exportToMarkdown = () => {
		const markdown = editor.api.markdown.serialize();
		const blob = new Blob([markdown], { type: "text/markdown" });
		const url = URL.createObjectURL(blob);

		downloadFile(url, getFileName("md"));
		URL.revokeObjectURL(url);
	};

	return (
		<DropdownMenu modal={false} {...openState} {...props}>
			<DropdownMenuTrigger asChild>
				<ToolbarButton pressed={openState.open} tooltip="Export" isDropdown>
					<ArrowDownToLineIcon className="size-4" />
				</ToolbarButton>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="start">
				<DropdownMenuGroup>
					<DropdownMenuItem onSelect={exportToMarkdown}>Export as Markdown</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
