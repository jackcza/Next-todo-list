"use client";

import { CheckCircleOutlined, DeleteOutlined, HolderOutlined, UndoOutlined } from "@ant-design/icons";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Empty, Tooltip } from "antd";
import { useId } from "react";
import { STATUS, type Todo } from "@/lib/todo";

type TodoListProps = {
  todos: Todo[];
  filter: string;
  onChangeStatus: (todo: Todo, status: string) => void;
  onReorder: (activeId: string, overId: string) => void;
};

const EMPTY_TEXT: Record<string, string> = {
  [STATUS.IS_CREATE]: "Nothing to do. Add a task above.",
  [STATUS.IS_DONE]: "No completed tasks yet.",
  [STATUS.IS_DELETE]: "Trash is empty.",
};

type TodoItemProps = {
  item: Todo;
  onChangeStatus: (todo: Todo, status: string) => void;
};

function TodoItem({ item, onChangeStatus }: TodoItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const isDone = item.status === STATUS.IS_DONE;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`todo-container-list ${isDone ? "todo-container-list-done" : ""} ${
        isDragging ? "todo-container-list-dragging" : ""
      }`}
    >
      <div className="todo-item-operation">
        <HolderOutlined
          ref={setActivatorNodeRef}
          className="todo-item-handle"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        />
        <span className="todo-item-content">{item.content}</span>
        <div className="todo-item-actions">
          <Tooltip title={isDone ? "Mark as active" : "Mark as done"}>
            {isDone ? (
              <UndoOutlined
                className="todo-action todo-action-undo"
                onClick={() => onChangeStatus(item, STATUS.IS_CREATE)}
              />
            ) : (
              <CheckCircleOutlined
                className="todo-action todo-action-done"
                onClick={() => onChangeStatus(item, STATUS.IS_DONE)}
              />
            )}
          </Tooltip>
          {item.status !== STATUS.IS_DELETE ? (
            <Tooltip title="Delete">
              <DeleteOutlined
                className="todo-action todo-action-delete"
                onClick={() => onChangeStatus(item, STATUS.IS_DELETE)}
              />
            </Tooltip>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function TodoList({ todos, filter, onChangeStatus, onReorder }: TodoListProps) {
  // Stable id keeps dnd-kit's generated aria attributes identical between server and client render.
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const showTodos = todos.filter((item) => item.status === filter);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onReorder(String(active.id), String(over.id));
  };

  if (showTodos.length === 0) {
    return (
      <div className="todo-container todo-container-empty">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={EMPTY_TEXT[filter]} />
      </div>
    );
  }

  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={showTodos.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ul className="todo-container">
          {showTodos.map((item) => (
            <TodoItem key={item.id} item={item} onChangeStatus={onChangeStatus} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
