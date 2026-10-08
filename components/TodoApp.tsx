"use client";

import { BulbOutlined, LogoutOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { arrayMove } from "@dnd-kit/sortable";
import { App, Button } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import InstallButton from "@/components/InstallButton";
import LanguageSwitch from "@/components/LanguageSwitch";
import RankBar from "@/components/RankBar";
import TodoFilter from "@/components/TodoFilter";
import TodoInput from "@/components/TodoInput";
import TodoList from "@/components/TodoList";
import { useI18n } from "@/components/I18nProvider";
import { ApiError, requestJson } from "@/lib/api-client";
import { DAYJS_LOCALE, toDateKey, useToday } from "@/lib/date";
import { getRank } from "@/lib/rank";
import { STATUS, type Todo } from "@/lib/todo";

type TodoAppProps = {
  email: string;
  initialTodos: Todo[];
  initialPoints: number;
};

type TodoUpdate = { todo: Todo; points: number };

export default function TodoApp({ email, initialTodos, initialPoints }: TodoAppProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const { t, locale, errorText } = useI18n();
  const [todos, setTodos] = useState(initialTodos);
  const [points, setPoints] = useState(initialPoints);
  const [filter, setFilter] = useState<string>(STATUS.IS_CREATE);
  const today = useToday();

  const goToLogin = () => {
    router.replace("/login");
    router.refresh();
  };

  const handleError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      goToLogin();
      return;
    }
    message.error(errorText(error));
  };

  const addTodo = async (content: string) => {
    try {
      const todo = await requestJson<Todo>("/api/todos", { method: "POST", body: { content, date: toDateKey() } });
      setTodos((prev) => [...prev, todo]);
      return true;
    } catch (error) {
      handleError(error);
      return false;
    }
  };

  const changeStatus = async (todo: Todo, status: string) => {
    try {
      const { todo: updated, points: nextPoints } = await requestJson<TodoUpdate>(`/api/todos/${todo.id}`, {
        method: "PATCH",
        body: { status },
      });
      setTodos((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setPoints(nextPoints);
      const before = getRank(points, t.rank);
      const after = getRank(nextPoints, t.rank);
      if (after.name !== before.name && after.totalStars > before.totalStars) {
        message.success(t.rank.promoted(after.name));
      } else if (after.totalStars > before.totalStars) {
        message.success(t.rank.starUp);
      }
    } catch (error) {
      handleError(error);
    }
  };

  const moveToDate = async (todo: Todo, date: string) => {
    try {
      const { todo: updated } = await requestJson<TodoUpdate>(`/api/todos/${todo.id}`, { method: "PATCH", body: { date } });
      // The server appends it to the end of the target day, so mirror that locally.
      setTodos((prev) => [...prev.filter((item) => item.id !== updated.id), updated]);
      message.success(t.app.movedTo(dayjs(date).locale(DAYJS_LOCALE[locale]).format(t.date.short)));
    } catch (error) {
      handleError(error);
    }
  };

  const reorderTodos = async (activeId: string, overId: string) => {
    const prev = todos;
    const visible = prev.filter((item) => item.status === filter);
    const from = visible.findIndex((item) => item.id === activeId);
    const to = visible.findIndex((item) => item.id === overId);
    if (from === -1 || to === -1 || visible[from].date !== visible[to].date) return;

    // Reorder only the visible items, keeping hidden ones in their original slots.
    const moved = arrayMove(visible, from, to);
    let cursor = 0;
    const next = prev.map((item) => (item.status === filter ? moved[cursor++] : item));
    setTodos(next);

    try {
      await requestJson("/api/todos/order", { method: "PUT", body: { ids: next.map((item) => item.id) } });
    } catch (error) {
      setTodos(prev);
      handleError(error);
    }
  };

  const logout = async () => {
    await requestJson("/api/auth/logout", { method: "POST" }).catch(() => undefined);
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
      />
    </div>
  );
}
