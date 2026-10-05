"use client";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  HolderOutlined,
  RightOutlined,
  UndoOutlined,
} from "@ant-design/icons";
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
import { Calendar, Empty, Popover, Skeleton, Tooltip } from "antd";
import dayjs from "dayjs";
import { useId, useState } from "react";
import { formatDay, formatStamp, toDateKey } from "@/lib/date";
import { STATUS, type Todo } from "@/lib/todo";

type TodoListProps = {
  todos: Todo[];
  filter: string;
  /** Null until the client knows the user's local day. */
  today: string | null;
  onChangeStatus: (todo: Todo, status: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onMove: (todo: Todo, date: string) => void;
};

const EMPTY_TEXT: Record<string, string> = {
  [STATUS.IS_CREATE]: "Nothing to do. Add a task above.",
  [STATUS.IS_DONE]: "No completed tasks yet.",
  [STATUS.IS_DELETE]: "Trash is empty.",
};

type TodoItemProps = {
  item: Todo;
  onChangeStatus: (todo: Todo, status: string) => void;
  onMove: (todo: Todo, date: string) => void;
};

function TodoItem({ item, onChangeStatus, onMove }: TodoItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const [pickerOpen, setPickerOpen] = useState(false);
  const isDone = item.status === STATUS.IS_DONE;
  const isDeleted = item.status === STATUS.IS_DELETE;

  const stamps = [`Added ${formatStamp(item.createdAt, item.date)}`];
  if (isDone && item.doneAt) stamps.push(`Done ${formatStamp(item.doneAt, item.date)}`);
  if (isDeleted && item.deletedAt) stamps.push(`Deleted ${formatStamp(item.deletedAt, item.date)}`);

  const datePicker = (
    <div className="todo-date-picker">
      <Calendar
        fullscreen={false}
        value={dayjs(item.date)}
        onSelect={(value, { source }) => {
          if (source !== "date") return;
          setPickerOpen(false);
          const date = toDateKey(value);
          if (date !== item.date) onMove(item, date);
        }}
      />
    </div>
  );

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
        <div className="todo-item-body">
          <span className="todo-item-content">{item.content}</span>
          <span className="todo-item-meta">{stamps.join(" · ")}</span>
        </div>
        <div className="todo-item-actions">
          {!isDeleted ? (
            <Popover
              content={datePicker}
              trigger="click"
              placement="bottomRight"
              open={pickerOpen}
              onOpenChange={setPickerOpen}
            >
              <Tooltip title="Move to another date">
                <CalendarOutlined className="todo-action todo-action-move" />
              </Tooltip>
            </Popover>
          ) : null}
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
          {!isDeleted ? (
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

/** Groups keep the list's position order inside each day. Today comes first, then upcoming days, then past days newest first. */
function groupByDate(todos: Todo[], today: string) {
  const groups = new Map<string, Todo[]>();
  for (const item of todos) {
    const group = groups.get(item.date);
    if (group) group.push(item);
    else groups.set(item.date, [item]);
  }
  const rank = (date: string) => (date === today ? 0 : date > today ? 1 : 2);
  return [...groups.entries()].sort(([a], [b]) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return rank(a) === 1 ? a.localeCompare(b) : b.localeCompare(a);
  });
}

export default function TodoList({ todos, filter, today, onChangeStatus, onReorder, onMove }: TodoListProps) {
  // Stable id keeps dnd-kit's generated aria attributes identical between server and client render.
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  // Day labels and times depend on the browser's time zone, so they are rendered on the client only.
  if (!today) {
    return (
      <div className="todo-container todo-container-loading">
        <Skeleton active title={false} paragraph={{ rows: 3 }} />
      </div>
    );
  }

  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="todo-groups">
        {groupByDate(showTodos, today).map(([date, items]) => {
          const isToday = date === today;
          const isOpen = isToday || (expanded[date] ?? false);
          const { label, detail } = formatDay(date, today);
          return (
            <section key={date} className="todo-group">
              <button
                type="button"
                className="todo-group-header"
                disabled={isToday}
                aria-expanded={isOpen}
                onClick={() => setExpanded((prev) => ({ ...prev, [date]: !isOpen }))}
              >
                {isToday ? null : <RightOutlined className={`todo-group-arrow ${isOpen ? "todo-group-arrow-open" : ""}`} />}
                <span className="todo-group-label">{label}</span>
                {detail ? <span className="todo-group-detail">{detail}</span> : null}
                <span className="todo-group-count">{items.length}</span>
              </button>
              {isOpen ? (
                <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                  <ul className="todo-container">
                    {items.map((item) => (
                      <TodoItem key={item.id} item={item} onChangeStatus={onChangeStatus} onMove={onMove} />
                    ))}
                  </ul>
                </SortableContext>
              ) : null}
            </section>
          );
        })}
      </div>
    </DndContext>
  );
}
