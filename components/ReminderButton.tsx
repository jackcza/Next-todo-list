"use client";

import { BellFilled, BellOutlined } from "@ant-design/icons";
import { App, Button } from "antd";
import { useEffect, useState } from "react";
import HoverTooltip from "@/components/HoverTooltip";
import { useI18n } from "@/components/I18nProvider";
import { ApiError } from "@/lib/api-client";
import { currentSubscription, disablePush, enablePush, pushSupport, refreshPush } from "@/lib/reminders-client";

type ReminderButtonProps = {
  publicKey: string;
  /** Whether this browser gets push reminders, so the page doesn't remind a second time. */
  onChange: (on: boolean) => void;
};

/** Turns push reminders on or off for this browser. */
export default function ReminderButton({ publicKey, onChange }: ReminderButtonProps) {
  const { t, locale, errorText } = useI18n();
  const { message } = App.useApp();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pushSupport() !== "supported" || Notification.permission !== "granted") return;
    let cancelled = false;
    currentSubscription()
      .then((subscription) => {
        if (!subscription || cancelled) return;
        setOn(true);
        onChange(true);
        return refreshPush(subscription, locale);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [locale, onChange]);

  const toggle = async () => {
    const support = pushSupport();
    if (support !== "supported") {
      message.info(support === "ios-needs-install" ? t.reminder.iosHint : t.reminder.unsupported);
      return;
    }
    setBusy(true);
    try {
      if (on) {
        await disablePush();
        setOn(false);
        onChange(false);
        message.success(t.reminder.turnedOff);
        return;
      }
      const result = await enablePush(publicKey, locale);
      if (result === "enabled") {
        setOn(true);
        onChange(true);
      } else {
        message.warning(result === "denied" ? t.reminder.denied : t.reminder.unsupported);
      }
    } catch (error) {
      // Server errors explain themselves; a failed browser subscription gets the generic text.
      message.error(error instanceof ApiError ? errorText(error) : t.reminder.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <HoverTooltip title={on ? t.reminder.tooltipOn : t.reminder.tooltipOff}>
      <Button
        size="small"
        type="text"
        icon={on ? <BellFilled className="todo-reminder-on" /> : <BellOutlined />}
        loading={busy}
        onClick={toggle}
      >
        {on ? t.reminder.on : t.reminder.off}
      </Button>
    </HoverTooltip>
  );
}
