export const LOCALES = ["en", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "lang";
export const HTML_LANG: Record<Locale, string> = { en: "en", zh: "zh-CN" };

export function isLocale(value: unknown): value is Locale {
  return (LOCALES as readonly unknown[]).includes(value);
}

/** A saved choice wins; otherwise Chinese for any zh* entry in Accept-Language that ranks above English. */
export function detectLocale(saved: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(saved)) return saved;
  const preferred = (acceptLanguage ?? "")
    .split(",")
    .map((part) => part.trim().split(";")[0].toLowerCase())
    .find((tag) => tag.startsWith("zh") || tag.startsWith("en"));
  return preferred?.startsWith("zh") ? "zh" : "en";
}

const en = {
  common: {
    email: "Email",
    password: "Password",
    logIn: "Log in",
    logOut: "Log out",
    signUp: "Sign up",
    guide: "Guide",
    invalidEmail: "Please enter a valid email address.",
    enterPassword: "Please enter your password.",
  },
  app: {
    title: "Todo List",
    tasksLeft: (n: number) => `${n} task${n === 1 ? "" : "s"} left`,
    movedTo: (date: string) => `Moved to ${date}`,
    placeholder: "What needs to be done?",
    add: "Add",
    tip: "Do what's important and urgent first, then what's important but not urgent, and keep the unimportant to a minimum.",
  },
  filter: {
    active: (n: number) => `Active (${n})`,
    done: (n: number) => `Done (${n})`,
    deleted: (n: number) => `Deleted (${n})`,
  },
  list: {
    emptyActive: "Nothing to do. Add a task above.",
    emptyDone: "No completed tasks yet.",
    emptyDeleted: "Trash is empty.",
    added: (time: string) => `Added ${time}`,
    doneAt: (time: string) => `Done ${time}`,
    deletedAt: (time: string) => `Deleted ${time}`,
    moveDate: "Move to another date",
    markActive: "Mark as active",
    markDone: "Mark as done",
    delete: "Delete",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    dragLabel: (content: string) => `${content}, drag to reorder`,
  },
  date: {
    yesterday: "Yesterday",
    today: "Today",
    tomorrow: "Tomorrow",
    short: "MMM D",
    shortYear: "MMM D, YYYY",
    weekday: "ddd, MMM D",
    weekdayYear: "ddd, MMM D, YYYY",
    month: "MMMM YYYY",
  },
  install: {
    button: "Install app",
    hintPre: "Tap the ",
    hintShare: "Share",
    hintMid: " button in Safari, then choose ",
    hintAdd: "Add to Home Screen",
    hintPost: ".",
  },
  rank: {
    label: "Rank",
    tiers: ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Starshine"],
    kings: [
      "Supreme King",
      "Extraordinary King",
      "Peerless King",
      "Unrivaled King",
      "Sacred King",
      "Glorious King",
      "Legendary King",
    ],
    stars: (n: number) => `${n} star${n === 1 ? "" : "s"}`,
    toNextStar: (tasks: number, points: number) =>
      `${tasks} more task${tasks === 1 ? "" : "s"} to the next star · ${points} pts`,
    next: (name: string) => `Next: ${name}`,
    promoted: (name: string) => `Promoted to ${name}!`,
    starUp: "New star ⭐",
  },
  auth: {
    loginSubtitle: "Welcome back to your Todo List",
    forgot: "Forgot password?",
    noAccount: "No account yet?",
    registerSubtitle: "Create an account to keep your tasks",
    createAccount: "Create account",
    haveAccount: "Already have an account?",
    resetTitle: "Reset password",
    resetSubtitle: "We'll email you a code to set a new password",
    resetButton: "Reset password",
    remembered: "Remembered it?",
    resetDone: "Password updated. You're now logged in.",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    confirmNewPassword: "Confirm new password",
    enterNewPassword: "Please enter a password.",
    passwordLength: (min: number, max: number) => `Password must be ${min}-${max} characters.`,
    confirmRequired: "Please confirm your password.",
    mismatch: "The two passwords do not match.",
    code: "Verification code",
    codeRequired: "Please enter the 6-digit code.",
    codeSent: "Verification code sent. Check your inbox.",
    resendIn: (s: number) => `Resend in ${s}s`,
    sendCode: "Send code",
  },
  admin: {
    loginTitle: "Admin",
    loginSubtitle: "Sign in to the Todo List dashboard",
    backToApp: "Back to Todo List",
    title: "Admin Dashboard",
    subtitle: "Todo List usage overview",
    todoApp: "Todo app",
    lastDays: (n: number) => `Last ${n} days`,
    totalUsers: "Total users",
    newUsersIn: (n: number) => `New users (${n}d)`,
    totalTasks: "Total tasks",
    tasksAddedIn: (n: number) => `Tasks added (${n}d)`,
    userGrowth: "User growth",
    newUsers: "New users",
    tasksPerDay: "Tasks added per day",
    tasksAdded: "Tasks added",
    tick: "MMM D",
    label: "ddd, MMM D, YYYY",
  },
};

export type Messages = typeof en;

const zh: Messages = {
  common: {
    email: "邮箱",
    password: "密码",
    logIn: "登录",
    logOut: "退出",
    signUp: "注册",
    guide: "使用说明",
    invalidEmail: "请输入有效的邮箱地址。",
    enterPassword: "请输入密码。",
  },
  app: {
    title: "Todo List",
    tasksLeft: (n) => `还有 ${n} 个任务`,
    movedTo: (date) => `已移到 ${date}`,
    placeholder: "要做点什么？",
    add: "添加",
    tip: "先做重要且紧急的事，再做重要但不紧急的事，尽量减少不重要的事。",
  },
  filter: {
    active: (n) => `进行中 (${n})`,
    done: (n) => `已完成 (${n})`,
    deleted: (n) => `已删除 (${n})`,
  },
  list: {
    emptyActive: "暂无任务，在上方添加一个吧。",
    emptyDone: "还没有完成的任务。",
    emptyDeleted: "回收站是空的。",
    added: (time) => `添加于 ${time}`,
    doneAt: (time) => `完成于 ${time}`,
    deletedAt: (time) => `删除于 ${time}`,
    moveDate: "移到其他日期",
    markActive: "标记为未完成",
    markDone: "标记为完成",
    delete: "删除",
    prevMonth: "上个月",
    nextMonth: "下个月",
    dragLabel: (content) => `${content}，拖动以排序`,
  },
  date: {
    yesterday: "昨天",
    today: "今天",
    tomorrow: "明天",
    short: "M月D日",
    shortYear: "YYYY年M月D日",
    weekday: "M月D日 ddd",
    weekdayYear: "YYYY年M月D日 ddd",
    month: "YYYY年M月",
  },
  install: {
    button: "安装应用",
    hintPre: "在 Safari 中点",
    hintShare: "分享",
    hintMid: "按钮，然后选择",
    hintAdd: "添加到主屏幕",
    hintPost: "。",
  },
  rank: {
    label: "段位",
    tiers: ["倔强青铜", "秩序白银", "荣耀黄金", "尊贵铂金", "永恒钻石", "至尊星耀"],
    kings: ["最强王者", "非凡王者", "无双王者", "绝世王者", "至圣王者", "荣耀王者", "传奇王者"],
    stars: (n) => `${n} 颗星`,
    toNextStar: (tasks, points) => `再完成 ${tasks} 个任务升星 · ${points} 分`,
    next: (name) => `下一段位：${name}`,
    promoted: (name) => `晋级 ${name}！`,
    starUp: "升星 ⭐",
  },
  auth: {
    loginSubtitle: "欢迎回到 Todo List",
    forgot: "忘记密码？",
    noAccount: "还没有账号？",
    registerSubtitle: "注册账号，保存你的任务",
    createAccount: "创建账号",
    haveAccount: "已有账号？",
    resetTitle: "重置密码",
    resetSubtitle: "我们会发送验证码到你的邮箱，用来设置新密码",
    resetButton: "重置密码",
    remembered: "想起来了？",
    resetDone: "密码已更新，已为你登录。",
    newPassword: "新密码",
    confirmPassword: "确认密码",
    confirmNewPassword: "确认新密码",
    enterNewPassword: "请输入密码。",
    passwordLength: (min, max) => `密码长度需为 ${min}-${max} 个字符。`,
    confirmRequired: "请再次输入密码。",
    mismatch: "两次输入的密码不一致。",
    code: "验证码",
    codeRequired: "请输入 6 位验证码。",
    codeSent: "验证码已发送，请查收邮件。",
    resendIn: (s) => `${s} 秒后重发`,
    sendCode: "发送验证码",
  },
  admin: {
    loginTitle: "管理后台",
    loginSubtitle: "登录 Todo List 管理后台",
    backToApp: "返回 Todo List",
    title: "管理后台",
    subtitle: "Todo List 使用概况",
    todoApp: "任务页",
    lastDays: (n) => `最近 ${n} 天`,
    totalUsers: "用户总数",
    newUsersIn: (n) => `新增用户（${n} 天）`,
    totalTasks: "任务总数",
    tasksAddedIn: (n) => `新增任务（${n} 天）`,
    userGrowth: "用户增长",
    newUsers: "新增用户",
    tasksPerDay: "每日新增任务",
    tasksAdded: "新增任务",
    tick: "M/D",
    label: "YYYY年M月D日 ddd",
  },
};

export const MESSAGES: Record<Locale, Messages> = { en, zh };

/** API routes answer in English; these map their messages for Chinese users. Unknown messages pass through. */
const SERVER_ERRORS_ZH: Record<string, string> = {
  "Please log in.": "请先登录。",
  "Please enter a valid email address.": "请输入有效的邮箱地址。",
  "Incorrect email or password.": "邮箱或密码错误。",
  "This email is already registered. Please log in.": "该邮箱已注册，请直接登录。",
  "No account found with this email.": "该邮箱还没有注册。",
  "Invalid request.": "请求无效。",
  "Please wait a minute before requesting another code.": "请等待一分钟后再获取验证码。",
  "Too many verification emails today. Please try again tomorrow.": "今天发送的验证码太多了，请明天再试。",
  "Could not send the verification email. Please try again later.": "验证码邮件发送失败，请稍后重试。",
  "The code has expired. Please request a new one.": "验证码已过期，请重新获取。",
  "Incorrect verification code.": "验证码错误。",
  "Invalid task status.": "任务状态无效。",
  "Invalid date.": "日期无效。",
  "Nothing to update.": "没有需要更新的内容。",
  "Task not found.": "找不到该任务。",
  "This task was just changed. Please try again.": "该任务刚刚被修改，请重试。",
  "Invalid task order.": "任务顺序无效。",
  "Task content cannot be empty.": "任务内容不能为空。",
  "This account does not have admin access.": "该账号没有管理员权限。",
  "Admin access required.": "需要管理员权限。",
  "Invalid range.": "时间范围无效。",
  "Invalid time zone.": "时区无效。",
  "Something went wrong. Please try again.": "出了点问题，请重试。",
};

const SERVER_ERROR_PATTERNS_ZH: [RegExp, (match: RegExpMatchArray) => string][] = [
  [/^Too many attempts\. Please try again in (\d+) minutes?\.$/, (m) => `尝试次数过多，请 ${m[1]} 分钟后再试。`],
  [/^Task content must be at most (\d+) characters\.$/, (m) => `任务内容最多 ${m[1]} 个字符。`],
  [/^Password must be (\d+)-(\d+) characters\.$/, (m) => `密码长度需为 ${m[1]}-${m[2]} 个字符。`],
];

export function translateServerError(message: string, locale: Locale) {
  if (locale === "en") return message;
  if (SERVER_ERRORS_ZH[message]) return SERVER_ERRORS_ZH[message];
  for (const [pattern, format] of SERVER_ERROR_PATTERNS_ZH) {
    const match = message.match(pattern);
    if (match) return format(match);
  }
  return message;
}
