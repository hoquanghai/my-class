import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  type CloneSetInput,
  type CloneSetResultDto,
  cloneSetSchema,
  type CommunityFacetsDto,
  type CommunityFacetsQuery,
  communityFacetsQuerySchema,
  type CommunityListQuery,
  communityListQuerySchema,
  type CreateCommentInput,
  createCommentSchema,
  type LikeSetResultDto,
  type PublishSetInput,
  publishSetSchema,
  type ReportSetInput,
  type ReportSetResultDto,
  reportSetSchema,
  type RepublishSetInput,
  republishSetSchema,
  type SharedSetCommentDto,
  type SharedSetDetailDto,
  type SharedSetListDto,
  type SharedSetSummaryDto,
  type UpdateSetInput,
  updateSetSchema,
} from '@lophoc/shared';
import {
  CurrentTeacher,
  type TeacherPrincipal,
} from '../../common/decorators/current-teacher.decorator.js';
import { CommunityService } from './community.service.js';

/** Cộng đồng chia sẻ bộ đề theo môn: chỉ giáo viên đã đăng nhập (không mở công khai để không lộ đáp án). */
@Controller('community')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('sets')
  list(
    @CurrentTeacher() t: TeacherPrincipal,
    @Query({ schema: communityListQuerySchema }) query: CommunityListQuery,
  ): Promise<SharedSetListDto> {
    return this.community.list(t.id, query);
  }

  @Get('mine')
  mine(@CurrentTeacher() t: TeacherPrincipal): Promise<SharedSetSummaryDto[]> {
    return this.community.mine(t.id);
  }

  @Get('facets')
  facets(
    @Query({ schema: communityFacetsQuerySchema }) query: CommunityFacetsQuery,
  ): Promise<CommunityFacetsDto> {
    return this.community.facets(query);
  }

  @Post('sets')
  @HttpCode(201)
  publish(
    @CurrentTeacher() t: TeacherPrincipal,
    @Body({ schema: publishSetSchema }) body: PublishSetInput,
  ): Promise<SharedSetDetailDto> {
    return this.community.publish(t.id, body);
  }

  @Get('sets/:id')
  detail(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('id') id: string,
  ): Promise<SharedSetDetailDto> {
    return this.community.detail(t.id, id);
  }

  @Patch('sets/:id')
  update(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('id') id: string,
    @Body({ schema: updateSetSchema }) body: UpdateSetInput,
  ): Promise<SharedSetDetailDto> {
    return this.community.update(t.id, id, body);
  }

  @Delete('sets/:id')
  @HttpCode(204)
  remove(@CurrentTeacher() t: TeacherPrincipal, @Param('id') id: string): Promise<void> {
    return this.community.remove(t.id, id);
  }

  @Post('sets/:id/republish')
  @HttpCode(200)
  republish(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('id') id: string,
    @Body({ schema: republishSetSchema }) body: RepublishSetInput,
  ): Promise<SharedSetDetailDto> {
    return this.community.republish(t.id, id, body);
  }

  @Post('sets/:id/clone')
  @HttpCode(201)
  clone(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('id') id: string,
    @Body({ schema: cloneSetSchema }) body: CloneSetInput,
  ): Promise<CloneSetResultDto> {
    return this.community.clone(t.id, id, body);
  }

  @Post('sets/:id/like')
  @HttpCode(200)
  like(@CurrentTeacher() t: TeacherPrincipal, @Param('id') id: string): Promise<LikeSetResultDto> {
    return this.community.setLike(t.id, id, true);
  }

  @Delete('sets/:id/like')
  @HttpCode(200)
  unlike(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('id') id: string,
  ): Promise<LikeSetResultDto> {
    return this.community.setLike(t.id, id, false);
  }

  @Get('sets/:id/comments')
  comments(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('id') id: string,
  ): Promise<SharedSetCommentDto[]> {
    return this.community.comments(t.id, id);
  }

  @Post('sets/:id/comments')
  @HttpCode(201)
  addComment(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('id') id: string,
    @Body({ schema: createCommentSchema }) body: CreateCommentInput,
  ): Promise<SharedSetCommentDto> {
    return this.community.addComment(t.id, id, body);
  }

  @Delete('comments/:commentId')
  @HttpCode(204)
  deleteComment(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('commentId') commentId: string,
  ): Promise<void> {
    return this.community.deleteComment(t.id, commentId);
  }

  @Post('comments/:commentId/resolve')
  @HttpCode(200)
  resolve(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('commentId') commentId: string,
  ): Promise<SharedSetCommentDto> {
    return this.community.toggleResolved(t.id, commentId);
  }

  @Post('sets/:id/report')
  @HttpCode(200)
  report(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('id') id: string,
    @Body({ schema: reportSetSchema }) body: ReportSetInput,
  ): Promise<ReportSetResultDto> {
    return this.community.report(t.id, id, body);
  }
}
