"use client";

import React from "react";
import ReactPlayer from "react-player";

import { cn, withRef } from "@udecode/cn";
import { useEditorMounted, withHOC } from "@udecode/plate-common/react";
import { useDraggable, useDraggableState } from "@udecode/plate-dnd";
import { parseTwitterUrl, parseVideoUrl } from "@udecode/plate-media";
import { useMediaState } from "@udecode/plate-media/react";
import { ResizableProvider, useResizableStore } from "@udecode/plate-resizable";

import { Caption, CaptionTextarea } from "./caption";
import { PlateElement } from "./plate-element";
import { Resizable, ResizeHandle, mediaResizeHandleVariants } from "./resizable";

export const MediaVideoElement = withHOC(
	ResizableProvider,
	withRef<typeof PlateElement>(({ children, className, nodeProps, ...props }, ref) => {
		const {
			align = "center",
			isUpload,
			readOnly,
			unsafeUrl,
		} = useMediaState({
			urlParsers: [parseTwitterUrl, parseVideoUrl],
		});
		const width = useResizableStore().get.width();

		const isEditorMounted = useEditorMounted();

		const isTweet = true;

		const state = useDraggableState({ element: props.element });
		const { isDragging } = state;
		const { handleRef } = useDraggable(state);

		return (
			<PlateElement ref={ref} className={cn("relative py-2.5", className)} {...props}>
				<figure className="relative m-0 cursor-default" contentEditable={false}>
					<Resizable
						className={cn(isDragging && "opacity-50")}
						align={align}
						options={{
							align,
							maxWidth: isTweet ? 550 : "100%",
							minWidth: isTweet ? 300 : 100,
							readOnly,
						}}
					>
						<div className="group/media">
							<ResizeHandle
								className={mediaResizeHandleVariants({ direction: "left" })}
								options={{ direction: "left" }}
							/>

							<ResizeHandle
								className={mediaResizeHandleVariants({ direction: "right" })}
								options={{ direction: "right" }}
							/>

							{/* TODO: Lazy load */}
							{isUpload && isEditorMounted && (
								<div ref={handleRef}>
									<ReactPlayer height="100%" url={unsafeUrl} width="100%" controls />
								</div>
							)}
						</div>
					</Resizable>

					<Caption style={{ width }} align={align}>
						<CaptionTextarea readOnly={readOnly} placeholder="Write a caption..." />
					</Caption>
				</figure>
				{children}
			</PlateElement>
		);
	}),
);
