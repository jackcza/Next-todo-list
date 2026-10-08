"use client";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  HolderOutlined,
  LeftOutlined,
  RightOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
import { Button, Calendar, Empty, Popover, Skeleton } from "antd";
import dayjs from "dayjs";
import { useId, useState, type SyntheticEvent } from "react";
import HoverTooltip from "@/components/HoverTooltip";
import { useI18n } from "@/components/I18nProvider";
import { burstCoins } from "@/lib/coinBurst";
import { DAYJS_LOCALE, formatDay, formatStamp, toDateKey } from "@/lib/date";
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

type TodoItemProps = {
  item: Todo;
  onChangeStatus: (todo: Todo, status: string) => void;
  onMove: (todo: Todo, date: string) => void;
};

/** React events bubble out of portals, so this keeps presses inside the date picker popover from dragging the row. */
const stopDrag = {
  onMouseDown: (event: SyntheticEvent) => event.stopPropagation(),
  onTouchStart: (event: SyntheticEvent) => event.stopPropagation(),
  onKeyDown: (event: SyntheticEvent) => event.stopPropagation(),
};

function TodoItem({ item, onChangeStatus, onMove }: TodoItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [pickerOpen, setPickerOpen] = useState(false);
  const { t, locale } = useI18n();
  const isDone = item.status === STATUS.IS_DONE;
  const isDeleted = item.status === STATUS.IS_DELETE;

  const stamps = [t.list.added(formatStamp(item.createdAt, item.date, t.date))];
  if (isDone && item.doneAt) stamps.push(t.list.doneAt(formatStamp(item.doneAt, item.date, t.date)));
  if (isDeleted && item.deletedAt) stamps.push(t.list.deletedAt(formatStamp(item.deletedAt, item.date, t.date)));

  const datePicker = (
    <div className="todo-date-picker" {...stopDrag}>
      <Calendar
        // Uncontrolled so the header can page through months; the key resets it after a move.
        key={item.date}
        fullscreen={false}
        defaultValue={dayjs(item.date)}
        headerRender={({ value, onChange }) => (
          <div className="todo-date-picker-header">
            <Button
              type="text"
              size="small"
              icon={<LeftOutlined />}
              aria-label={t.list.prevMonth}
              onClick={() => onChange(value.subtract(1, "month"))}
            />
            <span className="todo-date-picker-title">
              {value.locale(DAYJS_LOCALE[locale]).format(t.date.month)}
            </span>
            <Button
              type="text"
              size="small"
              icon={<RightOutlined />}
              aria-label={t.list.nextMonth}
              onClick={() => onChange(value.add(1, "month"))}
            />
          </div>
        )}
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
      aria-label={t.list.dragLabel(item.content)}
      {...attributes}
      {...listeners}
    >
      <div className="todo-item-operation">
        <HolderOutlined className="todo-item-handle" aria-hidden />
        <div className="todo-item-body">
          <span className="todo-item-content">{item.content}</span>
          <span className="todo-item-meta">{stamps.join(" · ")}</span>
        </div>
        <div className="todo-item-actions">
          <span className="todo-item-dot" aria-hidden />
          {!isDeleted ? (
            // The tooltip wraps the popover (not the other way round) so the popover's click handlers
            // still reach the icon when HoverTooltip renders no tooltip on touch screens.
            <HoverTooltip title={t.list.moveDate}>
              <Popover
                content={datePicker}
                trigger="click"
                // Centered placements let antd shift the popover sideways to stay on narrow screens.
                placement="bottom"
                open={pickerOpen}
                onOpenChange={setPickerOpen}
              >
                <CalendarOutlined className="todo-action todo-action-move" />
              </Popover>
            </HoverTooltip>
          ) : null}
          <HoverTooltip title={isDone ? t.list.markActive : t.list.markDone}>
            {isDone ? (
              <UndoOutlined
                className="todo-action todo-action-undo"
                onClick={() => onChangeStatus(item, STATUS.IS_CREATE)}
              />
            ) : (
              <CheckCircleOutlined
                className="todo-action todo-action-done"
                onClick={(event) => {
                  burstCoins(event.currentTarget);
                  onChangeStatus(item, STATUS.IS_DONE);
                }}
              />
            )}
          </HoverTooltip>
          {!isDeleted ? (
            <HoverTooltip title={t.list.delete}>
              <DeleteOutlined
                className="todo-action todo-action-delete"
                onClick={() => onChangeStatus(item, STATUS.IS_DELETE)}
              />
            </HoverTooltip>
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
    // A small move threshold lets clicks on the action icons through; touch needs a short hold so swipes still scroll.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { t, locale } = useI18n();
  const emptyText: Record<string, string> = {
    [STATUS.IS_CREATE]: t.list.emptyActive,
    [STATUS.IS_DONE]: t.list.emptyDone,
    [STATUS.IS_DELETE]: t.list.emptyDeleted,
  };

  const showTodos = todos.filter((item) => item.status === filter);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onReorder(String(active.id), String(over.id));
  };

  if (showTodos.length === 0) {
    return (
      <div className="todo-container todo-container-empty">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText[filter]} />
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
          const { label, detail } = formatDay(date, today, t.date, locale);
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
