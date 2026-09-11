import { formatVnd, monthlyEquivalent, PLAN_PRICES, transferMemo, yearlyPrice } from './plans.js';

describe('plans', () => {
  it('gói năm bằng 70% của 12 tháng, làm tròn 10.000đ', () => {
    expect(yearlyPrice(100_000)).toBe(840_000);
    expect(yearlyPrice(200_000)).toBe(1_680_000);
    expect(PLAN_PRICES.gold).toEqual({ monthly: 100_000, yearly: 840_000 });
    expect(PLAN_PRICES.platinum).toEqual({ monthly: 200_000, yearly: 1_680_000 });
    expect(PLAN_PRICES.free).toEqual({ monthly: 0, yearly: 0 });
  });

  it('quy giá năm ra mỗi tháng và định dạng tiền Việt', () => {
    expect(monthlyEquivalent('gold', 'yearly')).toBe(70_000);
    expect(monthlyEquivalent('platinum', 'monthly')).toBe(200_000);
    expect(formatVnd(1_680_000)).toBe('1.680.000đ');
    expect(formatVnd(0)).toBe('0đ');
  });

  it('nội dung chuyển khoản ghi gói, số tháng và email', () => {
    expect(transferMemo('gold', 'yearly', 'co@example.com')).toBe('LOPHOC GOLD 12T co@example.com');
    expect(transferMemo('platinum', 'monthly', 'a@b.vn')).toBe('LOPHOC PLATINUM 1T a@b.vn');
  });
});
