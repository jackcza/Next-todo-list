"use client";

import { CloudSyncOutlined, DisconnectOutlined, ExclamationCircleOutlined, LoginOutlined } from "@ant-design/icons";
import { useI18n } from "@/components/I18nProvider";
import type { SyncView } from "@/lib/sync-client";

type SyncStatusProps = {
  view: SyncView;
  onRetry: () => void;
  onLogin: () => void;
};

/** Hidden while everything is synced. */
export default function SyncStatus({ view, onRetry, onLogin }: SyncStatusProps) {
  const { t } = useI18n();
  const { status, pending } = view;

  if (status === "auth") {
    return (
      <button type="button" className="todo-sync todo-sync-warning" onClick={onLogin}>
        <LoginOutlined /> {t.sync.auth}
      </button>
    );
  }
  if (status === "error") {
    return (
      <button type="button" className="todo-sync todo-sync-error" onClick={onRetry}>
        <ExclamationCircleOutlined /> {t.sync.error}
      </button>
    );
  }
  if (status === "offline") {
    return (
      <p className="todo-sync">
        <DisconnectOutlined /> {pending > 0 ? t.sync.offlinePending(pending) : t.sync.offline}
      </p>
    );
  }
  if (pending > 0) {
    return (
      <p className="todo-sync">
        <CloudSyncOutlined spin /> {t.sync.syncing(pending)}
      </p>
    );
  }
  return null;
}
