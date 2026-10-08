"use client";

import { LockOutlined } from "@ant-design/icons";
import { Form, Input } from "antd";
import { useI18n } from "@/components/I18nProvider";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/constants";

/** `password` and `confirmPassword` fields with length and match checks. */
export default function NewPasswordFields({ isReset = false }: { isReset?: boolean }) {
  const { t } = useI18n();
  return (
    <>
      <Form.Item
        name="password"
        label={isReset ? t.auth.newPassword : t.common.password}
        rules={[
          { required: true, message: t.auth.enterNewPassword },
          { min: PASSWORD_MIN, max: PASSWORD_MAX, message: t.auth.passwordLength(PASSWORD_MIN, PASSWORD_MAX) },
        ]}
      >
        <Input.Password size="large" prefix={<LockOutlined />} autoComplete="new-password" />
      </Form.Item>
      <Form.Item
        name="confirmPassword"
        label={isReset ? t.auth.confirmNewPassword : t.auth.confirmPassword}
        dependencies={["password"]}
        rules={[
          { required: true, message: t.auth.confirmRequired },
          ({ getFieldValue }) => ({
            validator: (_, value) =>
              !value || getFieldValue("password") === value
                ? Promise.resolve()
                : Promise.reject(new Error(t.auth.mismatch)),
          }),
        ]}
      >
        <Input.Password size="large" prefix={<LockOutlined />} autoComplete="new-password" />
      </Form.Item>
    </>
  );
}
