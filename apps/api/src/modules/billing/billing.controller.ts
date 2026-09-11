import { Body, Controller, Get, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import {
  type BillingDto,
  type CreatePaymentRequestInput,
  createPaymentRequestSchema,
  type PaymentRequestDto,
} from '@lophoc/shared';
import type { Response } from 'express';
import {
  CurrentTeacher,
  type TeacherPrincipal,
} from '../../common/decorators/current-teacher.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { BillingService } from './billing.service.js';
import { renderDonePage, renderReviewPage } from './review-page.js';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('me')
  me(@CurrentTeacher() t: TeacherPrincipal): Promise<BillingDto> {
    return this.billing.me(t.id);
  }

  /** Giáo viên báo "đã chuyển khoản" → email cho admin, trạng thái chờ xác nhận. */
  @Post('requests')
  @HttpCode(201)
  create(
    @CurrentTeacher() t: TeacherPrincipal,
    @Body({ schema: createPaymentRequestSchema }) body: CreatePaymentRequestInput,
  ): Promise<PaymentRequestDto> {
    return this.billing.createRequest(t.id, body);
  }

  /** Trang duyệt cho admin, mở từ link trong email (token HMAC theo id yêu cầu). */
  @Public()
  @Get('review/:id')
  async reviewPage(
    @Param('id') id: string,
    @Query('token') token: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const info = await this.billing.reviewInfo(id, token);
    res.type('html').send(renderReviewPage(info, token ?? ''));
  }

  @Public()
  @Post('review/:id/confirm')
  @HttpCode(200)
  async confirm(
    @Param('id') id: string,
    @Body('token') token: string | undefined,
    @Body('note') note: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const dto = await this.billing.review(id, token, 'confirmed', note);
    res.type('html').send(renderDonePage(dto));
  }

  @Public()
  @Post('review/:id/reject')
  @HttpCode(200)
  async reject(
    @Param('id') id: string,
    @Body('token') token: string | undefined,
    @Body('note') note: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const dto = await this.billing.review(id, token, 'rejected', note);
    res.type('html').send(renderDonePage(dto));
  }
}
