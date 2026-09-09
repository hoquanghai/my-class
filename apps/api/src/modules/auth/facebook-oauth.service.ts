import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { Env } from '../../config/env.js';
import type { OAuthProfile, OAuthProviderService } from './oauth-profile.js';

const GRAPH = 'https://graph.facebook.com/v19.0';
const AUTHORIZE_URL = 'https://www.facebook.com/v19.0/dialog/oauth';

const tokenResponseSchema = z.object({ access_token: z.string().min(1) });
const meSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  email: z.string().min(3).optional(),
  picture: z.object({ data: z.object({ url: z.string().optional() }).optional() }).optional(),
});

/**
 * Facebook Login (authorization code) tự triển khai bằng fetch.
 * Cần quyền `email`; tài khoản Facebook không có email sẽ bị từ chối vì email là khóa tài khoản giáo viên.
 */
@Injectable()
export class FacebookOAuthService implements OAuthProviderService {
  readonly provider = 'facebook' as const;
  private readonly appId: string | undefined;
  private readonly appSecret: string | undefined;
  private readonly redirectUri: string;

  constructor(config: ConfigService<Env, true>) {
    this.appId = config.get('FACEBOOK_APP_ID', { infer: true }) || undefined;
    this.appSecret = config.get('FACEBOOK_APP_SECRET', { infer: true }) || undefined;
    this.redirectUri = `${config.get('API_URL', { infer: true })}/api/auth/facebook/callback`;
  }

  isConfigured(): boolean {
    return Boolean(this.appId && this.appSecret);
  }

  authorizeUrl(state: string): string {
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set('client_id', this.appId ?? '');
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'email,public_profile');
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCode(code: string): Promise<OAuthProfile> {
    const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
    tokenUrl.searchParams.set('client_id', this.appId ?? '');
    tokenUrl.searchParams.set('client_secret', this.appSecret ?? '');
    tokenUrl.searchParams.set('redirect_uri', this.redirectUri);
    tokenUrl.searchParams.set('code', code);
    const tokenRes = await fetch(tokenUrl);
    if (!tokenRes.ok) throw new UnauthorizedException('Facebook từ chối mã đăng nhập');
    const { access_token } = tokenResponseSchema.parse(await tokenRes.json());

    const meUrl = new URL(`${GRAPH}/me`);
    meUrl.searchParams.set('fields', 'id,name,email,picture.type(large)');
    meUrl.searchParams.set('access_token', access_token);
    const meRes = await fetch(meUrl);
    if (!meRes.ok) throw new UnauthorizedException('Không lấy được thông tin tài khoản Facebook');
    const me = meSchema.parse(await meRes.json());
    if (!me.email) {
      throw new UnauthorizedException(
        'Tài khoản Facebook chưa có email hoặc bạn chưa cho phép chia sẻ email',
      );
    }
    return {
      sub: me.id,
      email: me.email.trim().toLowerCase(),
      name: me.name?.trim() ?? '',
      picture: me.picture?.data?.url ?? null,
    };
  }
}
