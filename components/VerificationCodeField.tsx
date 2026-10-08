"use client";

import { SafetyOutlined } from "@ant-design/icons";
import { App, Button, Form, Input, type FormInstance } from "antd";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { requestJson } from "@/lib/api-client";
import { RESEND_SECONDS, type CodePurpose } from "@/lib/constants";

type VerificationCodeFieldProps = {
  form: FormInstance;
  purpose: CodePurpose;
};

/** Code input plus a "Send code" button that emails the address in the form's `email` field. */
export default function VerificationCodeField({ form, purpose }: VerificationCodeFieldProps) {
  const { message } = App.useApp();
  const { t, errorText } = useI18n();
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const sendCode = async () => {
    let email: string;
    try {
      ({ email } = await form.validateFields(["email"]));
    } catch {
      return;
    }
    setSending(true);
    try {
      await requestJson("/api/auth/send-code", { method: "POST", body: { email, purpose } });
      message.success(t.auth.codeSent);
      setCountdown(RESEND_SECONDS);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <Form.Item label={t.auth.code} required>
      <div className="auth-code-row">
        <Form.Item name="code" noStyle rules={[{ required: true, len: 6, message: t.auth.codeRequired }]}>
          <Input size="large" prefix={<SafetyOutlined />} maxLength={6} inputMode="numeric" autoComplete="one-time-code" />
        </Form.Item>
        <Button size="large" onClick={sendCode} loading={sending} disabled={countdown > 0}>
          {countdown > 0 ? t.auth.resendIn(countdown) : t.auth.sendCode}
        </Button>
      </div>
    </Form.Item>
  );
}
