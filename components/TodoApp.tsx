"use client";

import { BulbOutlined, LogoutOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { arrayMove } from "@dnd-kit/sortable";
import { App, Button } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import InstallButton from "@/components/InstallButton";
import LanguageSwitch from "@/components/LanguageSwitch";
import RankBar from "@/components/RankBar";
import SyncStatus from "@/components/SyncStatus";
import TodoFilter from "@/components/TodoFilter";
import TodoInput from "@/components/TodoInput";
import TodoList from "@/components/TodoList";
import { useI18n } from "@/components/I18nProvider";
import { ApiError, requestJson } from "@/lib/api-client";
import { DAYJS_LOCALE, toDateKey, useToday } from "@/lib/date";
import { translateServerError } from "@/lib/i18n";
import { getRank } from "@/lib/rank";
import { SyncEngine, newId, type Snapshot } from "@/lib/sync-client";
import { STATUS, type Todo } from "@/lib/todo";
import type { TodoChanges } from "@/lib/todo-ops";

type TodoAppProps = {
  email: string;
  snapshot: Snapshot;
};

export default function TodoApp({ email, snapshot }: TodoAppProps) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const { t, locale } = useI18n();
  const [engine] = useState(() => new SyncEngine(snapshot));
  const view = useSyncExternalStore(engine.subscribe, engine.getView, engine.getView);
  const { todos, points } = view;
  const [filter, setFilter] = useState<string>(STATUS.IS_CREATE);
  const today = useToday();

  const goToLogin = () => {
    router.replace("/login");
    router.refresh();
  };

  useEffect(
    () =>
      engine.start(() => {
        router.replace("/login");
        router.refresh();
      }),
    [engine, router],
  );

  useEffect(
    () =>
      engine.onNotice((notice) => {
        if (notice.type === "discarded") {
          message.warning(t.sync.discarded(notice.count));
        } else {
          for (const error of notice.errors) message.error(t.sync.rejected(translateServerError(error, locale)));
        }
      }),
    [engine, message, t, locale],
  );

  const addTodo = async (content: string) => {
    engine.enqueue({
      type: "create",
      todo: { id: newId(), content, date: toDateKey(), location: null, time: null },
    });
    return true;
  };

  const update = (todo: Todo, changes: TodoChanges) => engine.enqueue({ type: "update", todoId: todo.id, changes });

  const changeStatus = (todo: Todo, status: string) => {
    const before = getRank(engine.getView().points, t.rank);
    update(todo, { status });
    const after = getRank(engine.getView().points, t.rank);
    if (after.name !== before.name && after.totalStars > before.totalStars) {
      message.success(t.rank.promoted(after.name));
    } else if (after.totalStars > before.totalStars) {
      message.success(t.rank.starUp);
    }
  };

  const editTodo = async (todo: Todo, content: string) => {
    update(todo, { content });
    return true;
  };

  const setLocation = async (todo: Todo, location: string | null) => {
    update(todo, { location });
    return true;
  };

  const setTime = async (todo: Todo, time: string | null) => {
    update(todo, { time });
    return true;
  };

  const moveToDate = (todo: Todo, date: string) => {
    update(todo, { date });
    message.success(t.app.movedTo(dayjs(date).locale(DAYJS_LOCALE[locale]).format(t.date.short)));
  };

  const reorderTodos = (activeId: string, overId: string) => {
    const visible = todos.filter((item) => item.status === filter);
    const from = visible.findIndex((item) => item.id === activeId);
    const to = visible.findIndex((item) => item.id === overId);
    if (from === -1 || to === -1 || visible[from].date !== visible[to].date) return;

    // Reorder only the visible items, keeping hidden ones in their original slots.
    const moved = arrayMove(visible, from, to);
    let cursor = 0;
    const next = todos.map((item) => (item.status === filter ? moved[cursor++] : item));
    engine.enqueue({ type: "reorder", ids: next.map((item) => item.id) });
  };

  const logout = async () => {
    if (!navigator.onLine) {
      message.warning(t.sync.logoutOffline);
      return;
    }
    await engine.syncNow(true);
    const { pending } = engine.getView();
    if (pending > 0) {
      const confirmed = await modal.confirm({
        title: t.sync.logoutPendingTitle,
        content: t.sync.logoutPendingText(pending),
        okText: t.sync.logoutAnyway,
        okButtonProps: { danger: true },
        cancelText: t.sync.cancel,
      });
      if (!confirmed) return;
    }
    try {
      await requestJson("/api/auth/logout", { method: "POST" });
    } catch (error) {
      // A 401 means the session is already gone, which is what logging out wants anyway.
      if (!(error instanceof ApiError && error.status === 401)) {
        message.error(t.sync.logoutFailed);
        return;
      }
    }
    await engine.clearLocal();
    goToLogin();
  };

  const activeCount = todos.filter((item) => item.status === STATUS.IS_CREATE).length;
  const rank = getRank(points, t.rank);

  return (
    <div className="todo-app">
      <LanguageSwitch />
      <header className="todo-app-header">
        <h2 className="todo-app-title">{t.app.title}</h2>
        <p className="todo-app-subtitle">{t.app.tasksLeft(activeCount)}</p>
        <div className="todo-app-account">
          <span>{email}</span>
          <Button
            size="small"
            type="text"
            icon={<QuestionCircleOutlined />}
            href={`/guide.html?lang=${locale}`}
            target="_blank"
          >
            {t.common.guide}
          </Button>
          <InstallButton />
          <Button size="small" type="text" icon={<LogoutOutlined />} onClick={logout}>
            {t.common.logOut}
          </Button>
        </div>
      </header>
      <SyncStatus view={view} onRetry={() => void engine.syncNow()} onLogin={goToLogin} />
      <RankBar rank={rank} />
      <p className="todo-app-tip">
        <BulbOutlined /> {t.app.tip}
      </p>
      <TodoInput onSubmit={addTodo} />
      <TodoFilter filter={filter} setFilter={setFilter} todos={todos} />
      <TodoList
        todos={todos}
        filter={filter}
        today={today}
        onChangeStatus={changeStatus}
        onReorder={reorderTodos}
        onMove={moveToDate}
        onEdit={editTodo}
        onSetLocation={setLocation}
        onSetTime={setTime}
      />
    </div>
  );
}
