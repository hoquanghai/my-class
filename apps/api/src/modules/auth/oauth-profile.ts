/** Hồ sơ tối thiểu lấy từ nhà cung cấp OAuth để tạo hoặc liên kết tài khoản giáo viên. */
export type OAuthProvider = 'google' | 'facebook';

export interface OAuthProfile {
  /** ID người dùng phía nhà cung cấp (Google `sub`, Facebook `id`) */
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

/** Giao diện chung để controller xử lý mọi nhà cung cấp bằng một luồng. */
export interface OAuthProviderService {
  readonly provider: OAuthProvider;
  isConfigured(): boolean;
  authorizeUrl(state: string): string;
  exchangeCode(code: string): Promise<OAuthProfile>;
}
