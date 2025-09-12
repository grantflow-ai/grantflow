import Image from "next/image";
import { FILE_ICON_ALTS, FILE_ICON_PATHS } from "@/utils/file-extensions";

export const FILE_ICON_MAP = {
	csv: <Image alt={FILE_ICON_ALTS.csv} className="block" height={56} src={FILE_ICON_PATHS.csv} width={48} />,
	doc: <Image alt={FILE_ICON_ALTS.doc} className="block" height={56} src={FILE_ICON_PATHS.doc} width={48} />,
	docx: <Image alt={FILE_ICON_ALTS.docx} className="block" height={56} src={FILE_ICON_PATHS.docx} width={48} />,
	latex: <Image alt={FILE_ICON_ALTS.latex} className="block" height={56} src={FILE_ICON_PATHS.latex} width={48} />,
	markdown: (
		<Image alt={FILE_ICON_ALTS.markdown} className="block" height={56} src={FILE_ICON_PATHS.markdown} width={48} />
	),
	md: <Image alt={FILE_ICON_ALTS.md} className="block" height={56} src={FILE_ICON_PATHS.md} width={48} />,
	odt: <Image alt={FILE_ICON_ALTS.odt} className="block" height={56} src={FILE_ICON_PATHS.odt} width={48} />,
	pdf: <Image alt={FILE_ICON_ALTS.pdf} className="block" height={56} src={FILE_ICON_PATHS.pdf} width={48} />,
	ppt: <Image alt={FILE_ICON_ALTS.ppt} className="block" height={56} src={FILE_ICON_PATHS.ppt} width={48} />,
	pptx: <Image alt={FILE_ICON_ALTS.pptx} className="block" height={56} src={FILE_ICON_PATHS.pptx} width={48} />,
	rst: <Image alt={FILE_ICON_ALTS.rst} className="block" height={56} src={FILE_ICON_PATHS.rst} width={48} />,
	rtf: <Image alt={FILE_ICON_ALTS.rtf} className="block" height={56} src={FILE_ICON_PATHS.rtf} width={48} />,
	txt: <Image alt={FILE_ICON_ALTS.txt} className="block" height={56} src={FILE_ICON_PATHS.txt} width={48} />,
	xlsx: <Image alt={FILE_ICON_ALTS.xlsx} className="block" height={56} src={FILE_ICON_PATHS.xlsx} width={48} />,
} as const;
