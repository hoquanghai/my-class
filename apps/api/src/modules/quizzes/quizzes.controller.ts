import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  type AddQuizItemsInput,
  addQuizItemsSchema,
  type CreateQuizInput,
  createQuizSchema,
  type QuizDetailDto,
  type QuizSummaryDto,
  type RandomQuizItemsInput,
  randomQuizItemsSchema,
  type ReorderQuizItemsInput,
  reorderQuizItemsSchema,
  type UpdateQuizInput,
  type UpdateQuizItemInput,
  updateQuizItemSchema,
  updateQuizSchema,
} from '@lophoc/shared';
import {
  CurrentTeacher,
  type TeacherPrincipal,
} from '../../common/decorators/current-teacher.decorator.js';
import { QuizzesService } from './quizzes.service.js';

@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzes: QuizzesService) {}

  @Get()
  list(@CurrentTeacher() t: TeacherPrincipal): Promise<QuizSummaryDto[]> {
    return this.quizzes.list(t.id);
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentTeacher() t: TeacherPrincipal,
    @Body({ schema: createQuizSchema }) body: CreateQuizInput,
  ): Promise<QuizDetailDto> {
    return this.quizzes.create(t.id, body);
  }

  @Get(':id')
  detail(@CurrentTeacher() t: TeacherPrincipal, @Param('id') id: string): Promise<QuizDetailDto> {
    return this.quizzes.detail(t.id, id);
  }

  @Patch(':id')
  update(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('id') id: string,
    @Body({ schema: updateQuizSchema }) body: UpdateQuizInput,
  ): Promise<QuizDetailDto> {
    return this.quizzes.update(t.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentTeacher() t: TeacherPrincipal, @Param('id') id: string): Promise<void> {
    return this.quizzes.softDelete(t.id, id);
  }

  @Post(':id/items')
  @HttpCode(200)
  addItems(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('id') id: string,
    @Body({ schema: addQuizItemsSchema }) body: AddQuizItemsInput,
  ): Promise<QuizDetailDto> {
    return this.quizzes.addItems(t.id, id, body.questionIds);
  }

  @Post(':id/items/random')
  @HttpCode(200)
  addRandom(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('id') id: string,
    @Body({ schema: randomQuizItemsSchema }) body: RandomQuizItemsInput,
  ): Promise<QuizDetailDto> {
    return this.quizzes.addRandom(t.id, id, body.count, body.filter);
  }

  @Post(':id/items/reorder')
  @HttpCode(200)
  reorder(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('id') id: string,
    @Body({ schema: reorderQuizItemsSchema }) body: ReorderQuizItemsInput,
  ): Promise<QuizDetailDto> {
    return this.quizzes.reorder(t.id, id, body.itemIds);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body({ schema: updateQuizItemSchema }) body: UpdateQuizItemInput,
  ): Promise<QuizDetailDto> {
    return this.quizzes.updateItem(t.id, id, itemId, body);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(204)
  removeItem(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    return this.quizzes.removeItem(t.id, id, itemId);
  }
}
