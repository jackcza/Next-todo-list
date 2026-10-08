"use client";

import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { App, Button, Form, Input } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import LanguageSwitch from "@/components/LanguageSwitch";
import { requestJson } from "@/lib/api-client";

type LoginValues = {
  email: string;
  password: string;
};

export default function AdminLoginPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { t, errorText } = useI18n();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginValues) => {
    setLoading(true);
    try {
      await requestJson("/api/admin/login", { method: "POST", body: values });
      router.replace("/admin");
      router.refresh();
    } catch (error) {
      message.error(errorText(error));
      setLoading(false);
    }
  };

  return (
    <div className="todo-app auth-card">
      <LanguageSwitch />
      <header className="todo-app-header">
        <h2 className="todo-app-title">{t.admin.loginTitle}</h2>
        <p className="todo-app-subtitle">{t.admin.loginSubtitle}</p>
      </header>
      <Form<LoginValues> layout="vertical" requiredMark={false} onFinish={onFinish}>
        <Form.Item
          name="email"
          label={t.common.email}
          rules={[{ required: true, type: "email", message: t.common.invalidEmail }]}
        >
          <Input size="large" prefix={<MailOutlined />} autoComplete="email" />
        </Form.Item>
        <Form.Item
          name="password"
          label={t.common.password}
          rules={[{ required: true, message: t.common.enterPassword }]}
        >
          <Input.Password size="large" prefix={<LockOutlined />} autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>
          {t.common.logIn}
        </Button>
      </Form>
      <p className="auth-switch">
        <Link href="/">{t.admin.backToApp}</Link>
      </p>
    </div>
  );
}
