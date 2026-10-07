"use client";

import { DownloadOutlined } from "@ant-design/icons";
import { Button, Popover } from "antd";
import { useEffect, useState, useSyncExternalStore } from "react";

/** Chromium-only event; not in the DOM lib types. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const noopSubscribe = () => () => {};

function isIosBrowser() {
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iOS && !standalone;
}

/** Shows an install button when the browser can install the app, or Add to Home Screen steps on iOS Safari. */
export default function InstallButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const showIosHint = useSyncExternalStore(noopSubscribe, isIosBrowser, () => false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installEvent) {
    const install = async () => {
      await installEvent.prompt();
      await installEvent.userChoice;
      // A prompt event can only be used once.
      setInstallEvent(null);
    };
    return (
      <Button size="small" type="text" icon={<DownloadOutlined />} onClick={install}>
        Install app
      </Button>
    );
  }

  if (showIosHint) {
    return (
      <Popover
        trigger="click"
        placement="bottom"
        content={
          <span className="install-hint">
            Tap the <b>Share</b> button in Safari, then choose <b>Add to Home Screen</b>.
          </span>
        }
      >
        <Button size="small" type="text" icon={<DownloadOutlined />}>
          Install app
        </Button>
      </Popover>
    );
  }

  return null;
}
