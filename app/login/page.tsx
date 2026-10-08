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

export default function LoginPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { t, errorText } = useI18n();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginValues) => {
    setLoading(true);
    try {
      await requestJson("/api/auth/login", { method: "POST", body: values });
      router.replace("/");
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
        <h2 className="todo-app-title">{t.common.logIn}</h2>
        <p className="todo-app-subtitle">{t.auth.loginSubtitle}</p>
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
        <p className="auth-forgot">
          <Link href="/forgot-password">{t.auth.forgot}</Link>
        </p>
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>
          {t.common.logIn}
        </Button>
      </Form>
      <p className="auth-switch">
        {t.auth.noAccount} <Link href="/register">{t.common.signUp}</Link>
      </p>
    </div>
  );
}
