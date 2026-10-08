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

type RegisterValues = {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { t, errorText } = useI18n();
  const [form] = Form.useForm<RegisterValues>();
  const [loading, setLoading] = useState(false);

  const onFinish = async ({ email, code, password }: RegisterValues) => {
    setLoading(true);
    try {
      await requestJson("/api/auth/register", { method: "POST", body: { email, code, password } });
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
        <h2 className="todo-app-title">{t.common.signUp}</h2>
        <p className="todo-app-subtitle">{t.auth.registerSubtitle}</p>
      </header>
      <Form<RegisterValues> form={form} layout="vertical" requiredMark={false} onFinish={onFinish}>
        <Form.Item
          name="email"
          label={t.common.email}
          rules={[{ required: true, type: "email", message: t.common.invalidEmail }]}
        >
          <Input size="large" prefix={<MailOutlined />} autoComplete="email" />
        </Form.Item>
        <VerificationCodeField form={form} purpose="register" />
        <NewPasswordFields />
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>
          {t.auth.createAccount}
        </Button>
      </Form>
      <p className="auth-switch">
        {t.auth.haveAccount} <Link href="/login">{t.common.logIn}</Link>
      </p>
    </div>
  );
}
