"use client";

import { MailOutlined } from "@ant-design/icons";
import { App, Button, Form, Input } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import NewPasswordFields from "@/components/NewPasswordFields";
import VerificationCodeField from "@/components/VerificationCodeField";
import { errorMessage, requestJson } from "@/lib/api-client";

type ResetValues = {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<ResetValues>();
  const [loading, setLoading] = useState(false);

  const onFinish = async ({ email, code, password }: ResetValues) => {
    setLoading(true);
    try {
      await requestJson("/api/auth/reset-password", { method: "POST", body: { email, code, password } });
      message.success("Password updated. You're now logged in.");
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
        <h2 className="todo-app-title">Reset password</h2>
        <p className="todo-app-subtitle">We&apos;ll email you a code to set a new password</p>
      </header>
      <Form<ResetValues> form={form} layout="vertical" requiredMark={false} onFinish={onFinish}>
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, type: "email", message: "Please enter a valid email address." }]}
        >
          <Input size="large" prefix={<MailOutlined />} autoComplete="email" />
        </Form.Item>
        <VerificationCodeField form={form} purpose="reset" />
        <NewPasswordFields label="New password" />
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>
          Reset password
        </Button>
      </Form>
      <p className="auth-switch">
        Remembered it? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
