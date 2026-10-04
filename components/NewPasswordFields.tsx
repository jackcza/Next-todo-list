"use client";

import { LockOutlined } from "@ant-design/icons";
import { Form, Input } from "antd";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/constants";

/** `password` and `confirmPassword` fields with length and match checks. */
export default function NewPasswordFields({ label = "Password" }: { label?: string }) {
  return (
    <>
      <Form.Item
        name="password"
        label={label}
        rules={[
          { required: true, message: "Please enter a password." },
          { min: PASSWORD_MIN, max: PASSWORD_MAX, message: `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters.` },
        ]}
      >
        <Input.Password size="large" prefix={<LockOutlined />} autoComplete="new-password" />
      </Form.Item>
      <Form.Item
        name="confirmPassword"
        label={`Confirm ${label.toLowerCase()}`}
        dependencies={["password"]}
        rules={[
          { required: true, message: "Please confirm your password." },
          ({ getFieldValue }) => ({
            validator: (_, value) =>
              !value || getFieldValue("password") === value
                ? Promise.resolve()
                : Promise.reject(new Error("The two passwords do not match.")),
          }),
        ]}
      >
        <Input.Password size="large" prefix={<LockOutlined />} autoComplete="new-password" />
      </Form.Item>
    </>
  );
}
