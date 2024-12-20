"use client";

import React from "react";

import { cn, withRef } from "@udecode/cn";
import { withHOC } from "@udecode/plate-common/react";
import { parseTwitterUrl, parseVideoUrl } from "@udecode/plate-media";
import { MediaEmbedPlugin, useMediaState } from "@udecode/plate-media/react";
import { ResizableProvider, useResizableStore } from "@udecode/plate-resizable";

import { Caption, CaptionTextarea } from "./caption";
import { MediaPopover } from "./media-popover";
import { PlateElement } from "./plate-element";
import { Resizable, ResizeHandle, mediaResizeHandleVariants } from "./resizable";

export const MediaEmbedElement = withHOC(
	ResizableProvider,
	withRef<typeof PlateElement>(({ children, className, ...props }, ref) => {
		const { align = "center" } = useMediaState({
			urlParsers: [parseTwitterUrl, parseVideoUrl],
		});
		const width = useResizableStore().get.width();

		return (
			<MediaPopover plugin={MediaEmbedPlugin}>
				<PlateElement ref={ref} className={cn(className, "relative py-2.5")} {...props}>
					<figure className="group relative m-0 w-full cursor-default" contentEditable={false}>
						<Resizable
							align={align}
							options={{
								align,
								maxWidth: "100%",
								minWidth: 100,
							}}
						>
							<ResizeHandle
								className={mediaResizeHandleVariants({ direction: "left" })}
								options={{ direction: "left" }}
							/>

							<ResizeHandle
								className={mediaResizeHandleVariants({ direction: "right" })}
								options={{ direction: "right" }}
							/>
						</Resizable>

						<Caption style={{ width }} align={align}>
							<CaptionTextarea placeholder="Write a caption..." />
						</Caption>
					</figure>

					{children}
				</PlateElement>
			</MediaPopover>
		);
	}),
);
