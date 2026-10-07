"use client";

import { Tooltip, type TooltipProps } from "antd";
import { useSyncExternalStore, type ReactElement } from "react";

const HOVER_QUERY = "(hover: hover)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(HOVER_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * Tooltip only on devices that can hover. On touch screens the first tap would open the tooltip,
 * and iOS Safari then swallows that tap's click, so the action needs a second tap.
 */
export default function HoverTooltip({ children, ...props }: TooltipProps & { children: ReactElement }) {
  const canHover = useSyncExternalStore(subscribe, () => window.matchMedia(HOVER_QUERY).matches, () => true);
  return canHover ? <Tooltip {...props}>{children}</Tooltip> : children;
}
