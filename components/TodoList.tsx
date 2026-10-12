"use client";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
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
import { Button, Calendar, Empty, Input, Popover, Skeleton } from "antd";
import dayjs from "dayjs";
import { useId, useRef, useState, type SyntheticEvent } from "react";
import HoverTooltip from "@/components/HoverTooltip";
import { useI18n } from "@/components/I18nProvider";
import { burstCoins } from "@/lib/coinBurst";
import { DAYJS_LOCALE, formatDay, formatStamp, toDateKey } from "@/lib/date";
import { MAX_LOCATION_LENGTH, MAX_TODO_LENGTH, STATUS, isTimeKey, type Todo } from "@/lib/todo";

type TodoListProps = {
  todos: Todo[];
  filter: string;
  /** Null until the client knows the user's local day. */
  today: string | null;
  onChangeStatus: (todo: Todo, status: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onMove: (todo: Todo, date: string) => void;
  /** Resolves to false when saving failed, so the editor stays open. */
  onEdit: (todo: Todo, content: string) => Promise<boolean>;
  /** Null clears the location. Resolves to false when saving failed. */
  onSetLocation: (todo: Todo, location: string | null) => Promise<boolean>;
  /** 'HH:mm', or null to clear it. */
  onSetTime: (todo: Todo, time: string | null) => Promise<boolean>;
};

type TodoItemProps = {
  item: Todo;
  onChangeStatus: (todo: Todo, status: string) => void;
  onMove: (todo: Todo, date: string) => void;
  onEdit: (todo: Todo, content: string) => Promise<boolean>;
  onSetLocation: (todo: Todo, location: string | null) => Promise<boolean>;
  onSetTime: (todo: Todo, time: string | null) => Promise<boolean>;
};

/** React events bubble out of portals, so this keeps presses inside the date picker popover from dragging the row. */
const stopDrag = {
  onMouseDown: (event: SyntheticEvent) => event.stopPropagation(),
  onTouchStart: (event: SyntheticEvent) => event.stopPropagation(),
  onKeyDown: (event: SyntheticEvent) => event.stopPropagation(),
};

function TodoItem({ item, onChangeStatus, onMove, onEdit, onSetLocation, onSetTime }: TodoItemProps) {
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationDraft, setLocationDraft] = useState("");
  const [timeOpen, setTimeOpen] = useState(false);
  const [timeDraft, setTimeDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content);
  // Refs, not state: Enter and the blur that follows it run in the same render and must see each other.
  const saving = useRef(false);
  // Set once the editor is closing, so a late blur from the unmounting input doesn't save again.
  const cancelled = useRef(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: editing,
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const { t, locale } = useI18n();
  const isDone = item.status === STATUS.IS_DONE;
  const isDeleted = item.status === STATUS.IS_DELETE;

  const stamps = [t.list.added(formatStamp(item.createdAt, item.date, t.date))];
  if (isDone && item.doneAt) stamps.push(t.list.doneAt(formatStamp(item.doneAt, item.date, t.date)));
  if (isDeleted && item.deletedAt) stamps.push(t.list.deletedAt(formatStamp(item.deletedAt, item.date, t.date)));

  const startEdit = () => {
    cancelled.current = false;
    setDraft(item.content);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (cancelled.current || saving.current) return;
    const content = draft.trim();
    if (!content || content === item.content) {
      setEditing(false);
      return;
    }
    saving.current = true;
    const ok = await onEdit(item, content);
    saving.current = false;
    if (ok) {
      cancelled.current = true;
      setEditing(false);
    }
  };

  const toggleLocation = (open: boolean) => {
    if (open) setLocationDraft(item.location ?? "");
    setLocationOpen(open);
  };

  const saveLocation = async (value: string) => {
    const location = value.trim();
    if (location === (item.location ?? "") || (await onSetLocation(item, location || null))) {
      setLocationOpen(false);
    }
  };

  const toggleTime = (open: boolean) => {
    if (open) setTimeDraft(item.time ?? "");
    setTimeOpen(open);
  };

  const saveTime = async (value: string) => {
    const time = value.trim().slice(0, 5);
    if (time && !isTimeKey(time)) return;
    const next = time || null;
    if (next === item.time || (await onSetTime(item, next))) {
      setTimeOpen(false);
    }
  };

  const locationEditor = (
    <div className="todo-location-editor" {...stopDrag}>
      <Input
        autoFocus
        prefix={<EnvironmentOutlined />}
        placeholder={t.list.locationPlaceholder}
        value={locationDraft}
        maxLength={MAX_LOCATION_LENGTH}
        aria-label={t.list.location}
        onChange={(event) => setLocationDraft(event.target.value)}
        onPressEnter={() => saveLocation(locationDraft)}
      />
      <div className="todo-location-buttons">
        {item.location ? (
          <Button size="small" type="text" danger onClick={() => saveLocation("")}>
            {t.list.clearLocation}
          </Button>
        ) : null}
        <Button size="small" type="primary" onClick={() => saveLocation(locationDraft)}>
          {t.list.saveLocation}
        </Button>
      </div>
    </div>
  );

  const timeEditor = (
    <div className="todo-time-editor" {...stopDrag}>
      <Input
        autoFocus
        type="time"
        placeholder={t.list.timePlaceholder}
        value={timeDraft}
        aria-label={t.list.time}
        onChange={(event) => setTimeDraft(event.target.value.slice(0, 5))}
        onPressEnter={() => saveTime(timeDraft)}
      />
      <div className="todo-location-buttons">
        {item.time ? (
          <Button size="small" type="text" danger onClick={() => saveTime("")}>
            {t.list.clearTime}
          </Button>
        ) : null}
        <Button size="small" type="primary" onClick={() => saveTime(timeDraft)}>
          {t.list.saveTime}
        </Button>
      </div>
    </div>
  );

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
          {editing ? (
            <Input
              className="todo-item-editor"
              size="small"
              autoFocus
              value={draft}
              maxLength={MAX_TODO_LENGTH}
              aria-label={t.list.edit}
              onChange={(event) => setDraft(event.target.value)}
              onPressEnter={saveEdit}
              onBlur={saveEdit}
              onMouseDown={stopDrag.onMouseDown}
              onTouchStart={stopDrag.onTouchStart}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Escape") {
                  cancelled.current = true;
                  setEditing(false);
                }
              }}
            />
          ) : (
            <span className="todo-item-content" onDoubleClick={isDeleted ? undefined : startEdit}>
              {item.content}
            </span>
          )}
          {item.time || item.location ? (
            <span className="todo-item-extra">
              {item.time ? (
                <span className="todo-item-time">
                  <ClockCircleOutlined /> {item.time}
                </span>
              ) : null}
              {item.location ? (
                <span className="todo-item-location">
                  <EnvironmentOutlined /> {item.location}
                </span>
              ) : null}
            </span>
          ) : null}
          <span className="todo-item-meta">{stamps.join(" · ")}</span>
        </div>
        <div className="todo-item-actions">
          <span className="todo-item-dot" aria-hidden />
          {!isDeleted ? (
            <HoverTooltip title={t.list.edit}>
              <EditOutlined className="todo-action todo-action-edit" onClick={startEdit} />
            </HoverTooltip>
          ) : null}
          {!isDeleted ? (
            <HoverTooltip title={t.list.setLocation}>
              <Popover
                content={locationEditor}
                trigger="click"
                placement="bottom"
                open={locationOpen}
                onOpenChange={toggleLocation}
                destroyOnHidden
              >
                <EnvironmentOutlined
                  className={`todo-action todo-action-location ${item.location ? "todo-action-location-set" : ""}`}
                />
              </Popover>
            </HoverTooltip>
          ) : null}
          {!isDeleted ? (
            <HoverTooltip title={t.list.setTime}>
              <Popover
                content={timeEditor}
                trigger="click"
                placement="bottom"
                open={timeOpen}
                onOpenChange={toggleTime}
                destroyOnHidden
              >
                <ClockCircleOutlined className={`todo-action todo-action-time ${item.time ? "todo-action-time-set" : ""}`} />
              </Popover>
            </HoverTooltip>
          ) : null}
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

export default function TodoList({
  todos,
  filter,
  today,
  onChangeStatus,
  onReorder,
  onMove,
  onEdit,
  onSetLocation,
  onSetTime,
}: TodoListProps) {
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
                      <TodoItem
                        key={item.id}
                        item={item}
                        onChangeStatus={onChangeStatus}
                        onMove={onMove}
                        onEdit={onEdit}
                        onSetLocation={onSetLocation}
                        onSetTime={onSetTime}
                      />
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
