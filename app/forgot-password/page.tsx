"use client";

import { MailOutlined } from "@ant-design/icons";
import { App, Button, Form, Input } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import LanguageSwitch from "@/components/LanguageSwitch";
import NewPasswordFields from "@/components/NewPasswordFields";
import VerificationCodeField from "@/components/VerificationCodeField";
import { requestJson } from "@/lib/api-client";

type ResetValues = {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { t, errorText } = useI18n();
  const [form] = Form.useForm<ResetValues>();
  const [loading, setLoading] = useState(false);

  const onFinish = async ({ email, code, password }: ResetValues) => {
    setLoading(true);
    try {
      await requestJson("/api/auth/reset-password", { method: "POST", body: { email, code, password } });
      message.success(t.auth.resetDone);
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
        <h2 className="todo-app-title">{t.auth.resetTitle}</h2>
        <p className="todo-app-subtitle">{t.auth.resetSubtitle}</p>
      </header>
      <Form<ResetValues> form={form} layout="vertical" requiredMark={false} onFinish={onFinish}>
        <Form.Item
          name="email"
          label={t.common.email}
          rules={[{ required: true, type: "email", message: t.common.invalidEmail }]}
        >
          <Input size="large" prefix={<MailOutlined />} autoComplete="email" />
        </Form.Item>
        <VerificationCodeField form={form} purpose="reset" />
        <NewPasswordFields isReset />
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>
          {t.auth.resetButton}
        </Button>
      </Form>
      <p className="auth-switch">
        {t.auth.remembered} <Link href="/login">{t.common.logIn}</Link>
      </p>
    </div>
  );
}
