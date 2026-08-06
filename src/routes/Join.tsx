import { useEffect, useState, type FormEvent } from 'react';
import { Shell } from '@/components/Shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AUTH_ENABLED } from '@/lib/auth';
import { ALL_LEVELS } from '@/levels';

type Status = 'idle' | 'submitting' | 'invited' | 'already_invited' | 'error';
type Lang = 'en' | 'zh';

const YEAR_LABEL_ZH: Record<string, string> = {
  'Year 3': '三年级',
  'Year 5': '五年级',
  'Year 7': '七年级',
  'Year 9': '九年级',
  Difficult: '较难',
  Challenging: '挑战级',
};

const COPY = {
  en: {
    htmlLang: 'en',
    switchHref: '/join/zh/',
    switchLabel: '中文',
    heading: 'Get access',
    intro:
      "NAPLAN Style Spelling now supports AI-marked photo scoring: take a photo of a handwritten answer sheet and get it marked automatically. This feature needs a free sign-in, by invitation only. Enter your details below and we'll email an invite link.",
    welcome:
      "Welcome students, and thanks for trying out NAPLAN Style Spelling's new AI-supported marking! This feature is for you and for any friends you'd like to invite — please do invite friends!",
    studentName: "Student's name",
    email: 'Parent/guardian email',
    level: 'Which level?',
    optional: '(optional)',
    levelPlaceholder: 'Not sure yet',
    levelLabel: (l: string) => l,
    submitting: 'Sending…',
    submit: 'Request access',
    error: 'Something went wrong — please try again in a moment.',
    checkEmailHeading: 'Check your email',
    invited: "We've sent an invite link — click it to create your sign-in and start using AI marking.",
    alreadyInvited: "You're already invited — look for the invite email (check spam if it's not in your inbox).",
    notSetUp: 'Not set up yet.',
  },
  zh: {
    htmlLang: 'zh-Hans',
    switchHref: '/join/',
    switchLabel: 'English',
    heading: '获取访问权限',
    intro:
      'NAPLAN Style Spelling 现已支持 AI 自动批改功能：拍摄一张手写答题纸的照片，即可自动批改评分。该功能需要免费登录，且仅限受邀用户使用。请在下方填写您的信息，我们会通过邮件发送邀请链接。',
    welcome:
      '欢迎同学们，感谢你们尝试 NAPLAN Style Spelling 全新的 AI 智能批改功能！这项功能是为你，也是为你想邀请的朋友们准备的——欢迎邀请朋友一起使用！',
    studentName: '学生姓名',
    email: '家长/监护人邮箱',
    level: '级别',
    optional: '（可选）',
    levelPlaceholder: '暂不确定',
    levelLabel: (l: string) => YEAR_LABEL_ZH[l] ?? l,
    submitting: '发送中…',
    submit: '申请访问权限',
    error: '出现问题，请稍后重试。',
    checkEmailHeading: '请查收邮件',
    invited: '我们已发送邀请链接——点击链接即可创建登录账号，开始使用 AI 批改功能。',
    alreadyInvited: '您已经收到过邀请——请查找邀请邮件（如收件箱中没有，请检查垃圾邮件文件夹）。',
    notSetUp: '功能尚未开通。',
  },
} as const satisfies Record<Lang, unknown>;

function JoinForm({ t }: { t: (typeof COPY)[Lang] }) {
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus('submitting');
    try {
      const res = await fetch('/.netlify/functions/request-invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          studentName: form.get('studentName'),
          levelId: form.get('levelId'),
          website: form.get('website'), // honeypot
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as { status: Status };
      setStatus(data.status === 'already_invited' ? 'already_invited' : 'invited');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'invited' || status === 'already_invited') {
    return (
      <Card>
        <CardContent>
          <p className="font-medium text-foreground">{t.checkEmailHeading}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {status === 'invited' ? t.invited : t.alreadyInvited}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="studentName" className="text-sm font-medium text-foreground">
          {t.studentName}
        </label>
        <Input id="studentName" name="studentName" required maxLength={200} autoComplete="name" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          {t.email}
        </label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="levelId" className="text-sm font-medium text-foreground">
          {t.level} <span className="text-muted-foreground font-normal">{t.optional}</span>
        </label>
        <select
          id="levelId"
          name="levelId"
          defaultValue=""
          className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option value="">{t.levelPlaceholder}</option>
          {ALL_LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {t.levelLabel(l.yearLabel)}
            </option>
          ))}
        </select>
      </div>
      {/* Honeypot — hidden from real visitors, bots tend to fill every field. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />
      {status === 'error' && <p className="text-sm text-destructive">{t.error}</p>}
      <Button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

function JoinPage({ lang }: { lang: Lang }) {
  const t = COPY[lang];

  useEffect(() => {
    const prev = document.documentElement.lang;
    document.documentElement.lang = t.htmlLang;
    return () => {
      document.documentElement.lang = prev;
    };
  }, [t.htmlLang]);

  return (
    <Shell>
      <section className="mx-auto max-w-md px-5 pt-8 sm:pt-10 pb-10">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">{t.heading}</h1>
          <a href={t.switchHref} className="mt-2 shrink-0 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
            {t.switchLabel}
          </a>
        </div>
        <p className="mt-4 text-muted-foreground">{t.intro}</p>
        <p className="mt-4 text-muted-foreground">{t.welcome}</p>
        <div className="mt-6">{AUTH_ENABLED ? <JoinForm t={t} /> : <p className="text-muted-foreground">{t.notSetUp}</p>}</div>
      </section>
    </Shell>
  );
}

export function Join() {
  return <JoinPage lang="en" />;
}

export function JoinZh() {
  return <JoinPage lang="zh" />;
}
