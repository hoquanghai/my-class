import { MailerService } from './mailer.service.js';

/** ConfigService giả: chỉ cần `get(key)`. */
function service(env: Record<string, unknown>): MailerService {
  return new MailerService({ get: (key: string) => env[key] } as never);
}

const message = { to: 'co@example.com', subject: 'Xin chào', html: '<p>x</p>', text: 'x' };

describe('MailerService', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('memory: giữ email trong outbox, không gọi mạng', async () => {
    const mailer = service({ MAIL_TRANSPORT: 'memory', MAIL_FROM: 'Lớp Học <a@b.vn>' });
    await mailer.send(message);
    expect(mailer.outbox).toEqual([message]);
  });

  it('resend: POST tới API Resend với Bearer key, from/to/subject/html/text', async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response('{"id":"em_1"}', { status: 200 });
    }) as typeof fetch;
    await service({
      MAIL_TRANSPORT: 'resend',
      MAIL_FROM: 'Lớp Học <no-reply@lophoc.app>',
      RESEND_API_KEY: 're_test_123',
    }).send(message);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://api.resend.com/emails');
    expect(calls[0]!.init?.method).toBe('POST');
    expect(calls[0]!.init?.headers).toMatchObject({ Authorization: 'Bearer re_test_123' });
    expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({
      from: 'Lớp Học <no-reply@lophoc.app>',
      to: ['co@example.com'],
      subject: 'Xin chào',
      html: '<p>x</p>',
      text: 'x',
    });
  });

  it('resend: lỗi từ API chỉ ghi log, không ném ra request gọi nó', async () => {
    globalThis.fetch = (async () =>
      new Response('{"message":"Domain not verified"}', { status: 403 })) as typeof fetch;
    const mailer = service({
      MAIL_TRANSPORT: 'resend',
      MAIL_FROM: 'x <a@b.vn>',
      RESEND_API_KEY: 'k',
    });
    await expect(mailer.send(message)).resolves.toBeUndefined();
    expect(mailer.outbox).toEqual([]);
  });
});
