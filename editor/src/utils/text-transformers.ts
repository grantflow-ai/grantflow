import { TiptapTransformer } from "@hocuspocus/transformer";
import { generateJSON } from "@tiptap/core";
import showdown from "showdown";
import { EditorExtensions } from "@/editor/editor-extensions";

function markdownToHtml(markdown: string) {
	const converter = new showdown.Converter();
	return converter.makeHtml(markdown);
}

function htmlToEditorJson(html: string) {
	return generateJSON(html, EditorExtensions);
}

export function markdownToYDoc(markdown: string) {
	const htmlContent = markdownToHtml(markdown);
	const jsonContent = htmlToEditorJson(htmlContent);
	return TiptapTransformer.toYdoc(jsonContent, "default", EditorExtensions);
}
