from io import BytesIO

from docx import Document
from markdown import markdown


def markdown_to_docx(markdown_text: str) -> bytes:
    markdown(markdown_text, extensions=["tables", "fenced_code", "nl2br"])

    doc = Document()
    doc.add_heading("Grant Application", 0)

    lines = markdown_text.split("\n")
    current_paragraph = None

    for line in lines:
        stripped_line = line.strip()

        if stripped_line.startswith("# "):
            doc.add_heading(stripped_line[2:], level=1)
            current_paragraph = None
        elif stripped_line.startswith("## "):
            doc.add_heading(stripped_line[3:], level=2)
            current_paragraph = None
        elif stripped_line.startswith("### "):
            doc.add_heading(stripped_line[4:], level=3)
            current_paragraph = None
        elif stripped_line.startswith(("- ", "* ")):
            doc.add_paragraph(stripped_line[2:], style="List Bullet")
            current_paragraph = None
        elif stripped_line.startswith("1. ") or (
            len(stripped_line) > 2 and stripped_line[0].isdigit() and stripped_line[1:3] == ". "
        ):
            doc.add_paragraph(stripped_line[stripped_line.index(". ") + 2 :], style="List Number")
            current_paragraph = None
        elif stripped_line:
            if current_paragraph is None:
                current_paragraph = doc.add_paragraph(stripped_line)
            else:
                current_paragraph.add_run(" " + stripped_line)
        else:
            current_paragraph = None

    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.read()
