"use client";

import { Segmented } from "antd";
import { STATUS, type Todo } from "@/lib/todo";

type TodoFilterProps = {
  filter: string;
  setFilter: (filter: string) => void;
  todos: Todo[];
};

export default function TodoFilter({ filter, setFilter, todos }: TodoFilterProps) {
  const countOf = (status: string) => todos.filter((item) => item.status === status).length;

  const options = [
    { label: `Active (${countOf(STATUS.IS_CREATE)})`, value: STATUS.IS_CREATE },
    { label: `Done (${countOf(STATUS.IS_DONE)})`, value: STATUS.IS_DONE },
    { label: `Deleted (${countOf(STATUS.IS_DELETE)})`, value: STATUS.IS_DELETE },
  ];

  return (
    <div className="todo-filter">
      <Segmented<string> block options={options} value={filter} onChange={setFilter} />
    </div>
  );
}
