import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { Env } from '../../config/env.js';
import type { OAuthProfile, OAuthProviderService } from './oauth-profile.js';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

const tokenResponseSchema = z.object({ access_token: z.string().min(1) });
const userInfoSchema = z.object({
  sub: z.string().min(1),
  email: z.string().min(3),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
});

export type GoogleProfile = OAuthProfile;

/** Google OAuth 2.0 (authorization code) tự triển khai bằng fetch, không cần Passport. */
@Injectable()
export class GoogleOAuthService implements OAuthProviderService {
  readonly provider = 'google' as const;
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly redirectUri: string;

  constructor(config: ConfigService<Env, true>) {
    this.clientId = config.get('GOOGLE_CLIENT_ID', { infer: true }) || undefined;
    this.clientSecret = config.get('GOOGLE_CLIENT_SECRET', { infer: true }) || undefined;
    this.redirectUri = `${config.get('API_URL', { infer: true })}/api/auth/google/callback`;
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  authorizeUrl(state: string): string {
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set('client_id', this.clientId ?? '');
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('prompt', 'select_account');
    return url.toString();
  }

  async exchangeCode(code: string): Promise<GoogleProfile> {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId ?? '',
        client_secret: this.clientSecret ?? '',
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) throw new UnauthorizedException('Google từ chối mã đăng nhập');
    const { access_token } = tokenResponseSchema.parse(await tokenRes.json());

    const infoRes = await fetch(USERINFO_URL, {
      headers: { authorization: `Bearer ${access_token}` },
    });
    if (!infoRes.ok) throw new UnauthorizedException('Không lấy được thông tin tài khoản Google');
    const info = userInfoSchema.parse(await infoRes.json());
    if (!info.email_verified) {
      throw new UnauthorizedException('Email Google của bạn chưa được xác thực');
    }
    return {
      sub: info.sub,
      email: info.email.trim().toLowerCase(),
      name: info.name?.trim() ?? '',
      picture: info.picture ?? null,
    };
  }
}
