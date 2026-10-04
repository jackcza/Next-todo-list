"use client";

import { LogoutOutlined } from "@ant-design/icons";
import { arrayMove } from "@dnd-kit/sortable";
import { App, Button } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import TodoFilter from "@/components/TodoFilter";
import TodoInput from "@/components/TodoInput";
import TodoList from "@/components/TodoList";
import { ApiError, errorMessage, requestJson } from "@/lib/api-client";
import { STATUS, type Todo } from "@/lib/todo";

type TodoAppProps = {
  email: string;
  initialTodos: Todo[];
};

export default function TodoApp({ email, initialTodos }: TodoAppProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const [todos, setTodos] = useState(initialTodos);
  const [filter, setFilter] = useState<string>(STATUS.IS_CREATE);

  const goToLogin = () => {
    router.replace("/login");
    router.refresh();
  };

  const handleError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      goToLogin();
      return;
    }
    message.error(errorMessage(error));
  };

  const addTodo = async (content: string) => {
    try {
      const todo = await requestJson<Todo>("/api/todos", { method: "POST", body: { content } });
      setTodos((prev) => [...prev, todo]);
      return true;
    } catch (error) {
      handleError(error);
      return false;
    }
  };

  const changeStatus = async (todo: Todo, status: string) => {
    try {
      const updated = await requestJson<Todo>(`/api/todos/${todo.id}`, { method: "PATCH", body: { status } });
      setTodos((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      handleError(error);
    }
  };

  const reorderTodos = async (activeId: string, overId: string) => {
    const prev = todos;
    const visible = prev.filter((item) => item.status === filter);
    const from = visible.findIndex((item) => item.id === activeId);
    const to = visible.findIndex((item) => item.id === overId);
    if (from === -1 || to === -1) return;

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

  return (
    <div className="todo-app">
      <header className="todo-app-header">
        <h2 className="todo-app-title">Todo List</h2>
        <p className="todo-app-subtitle">
          {activeCount} task{activeCount === 1 ? "" : "s"} left
        </p>
        <div className="todo-app-account">
          <span>{email}</span>
          <Button size="small" type="text" icon={<LogoutOutlined />} onClick={logout}>
            Log out
          </Button>
        </div>
      </header>
      <TodoInput onSubmit={addTodo} />
      <TodoFilter filter={filter} setFilter={setFilter} todos={todos} />
      <TodoList todos={todos} filter={filter} onChangeStatus={changeStatus} onReorder={reorderTodos} />
    </div>
  );
}
