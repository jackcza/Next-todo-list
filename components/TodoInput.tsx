"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";
import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { MAX_TODO_LENGTH } from "@/lib/todo";

type TodoInputProps = {
  onSubmit: (content: string) => Promise<boolean>;
};

export default function TodoInput({ onSubmit }: TodoInputProps) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const content = value.trim();

  const handleSubmit = async () => {
    if (!content || submitting) return;
    setSubmitting(true);
    const ok = await onSubmit(content);
    setSubmitting(false);
    if (ok) setValue("");
  };

  return (
    <div className="todo-app-input">
      <Input
        size="large"
        value={value}
        maxLength={MAX_TODO_LENGTH}
        onChange={(event) => setValue(event.target.value)}
        onPressEnter={handleSubmit}
        placeholder={t.app.placeholder}
      />
      <Button
        size="large"
        type="primary"
        icon={<PlusOutlined />}
        onClick={handleSubmit}
        disabled={!content}
        loading={submitting}
      >
        {t.app.add}
      </Button>
    </div>
  );
}
