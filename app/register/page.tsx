"use client";

import { MailOutlined } from "@ant-design/icons";
import { App, Button, Form, Input } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import NewPasswordFields from "@/components/NewPasswordFields";
import VerificationCodeField from "@/components/VerificationCodeField";
import { errorMessage, requestJson } from "@/lib/api-client";

type RegisterValues = {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<RegisterValues>();
  const [loading, setLoading] = useState(false);

  const onFinish = async ({ email, code, password }: RegisterValues) => {
    setLoading(true);
    try {
      await requestJson("/api/auth/register", { method: "POST", body: { email, code, password } });
      router.replace("/");
      router.refresh();
    } catch (error) {
      message.error(errorMessage(error));
      setLoading(false);
    }
  };

  return (
    <div className="todo-app auth-card">
      <header className="todo-app-header">
        <h2 className="todo-app-title">Sign up</h2>
        <p className="todo-app-subtitle">Create an account to keep your tasks</p>
      </header>
      <Form<RegisterValues> form={form} layout="vertical" requiredMark={false} onFinish={onFinish}>
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, type: "email", message: "Please enter a valid email address." }]}
        >
          <Input size="large" prefix={<MailOutlined />} autoComplete="email" />
        </Form.Item>
        <VerificationCodeField form={form} purpose="register" />
        <NewPasswordFields />
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>
          Create account
        </Button>
      </Form>
      <p className="auth-switch">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
