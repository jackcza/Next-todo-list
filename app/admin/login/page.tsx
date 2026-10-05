"use client";

import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { App, Button, Form, Input } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessage, requestJson } from "@/lib/api-client";

type LoginValues = {
  email: string;
  password: string;
};

export default function AdminLoginPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginValues) => {
    setLoading(true);
    try {
      await requestJson("/api/admin/login", { method: "POST", body: values });
      router.replace("/admin");
      router.refresh();
    } catch (error) {
      message.error(errorMessage(error));
      setLoading(false);
    }
  };

  return (
    <div className="todo-app auth-card">
      <header className="todo-app-header">
        <h2 className="todo-app-title">Admin</h2>
        <p className="todo-app-subtitle">Sign in to the Todo List dashboard</p>
      </header>
      <Form<LoginValues> layout="vertical" requiredMark={false} onFinish={onFinish}>
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, type: "email", message: "Please enter a valid email address." }]}
        >
          <Input size="large" prefix={<MailOutlined />} autoComplete="email" />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true, message: "Please enter your password." }]}>
          <Input.Password size="large" prefix={<LockOutlined />} autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>
          Log in
        </Button>
      </Form>
      <p className="auth-switch">
        <Link href="/">Back to Todo List</Link>
      </p>
    </div>
  );
}
