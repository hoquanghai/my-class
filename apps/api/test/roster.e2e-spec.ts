import type { INestApplication } from '@nestjs/common';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { cleanupE2eData, cookieHeader, createTestApp, type Session, signup } from './helpers.js';

interface StudentRow {
  id: string;
  name: string;
  parentPhone: string | null;
  sortOrder: number;
}

describe('Roster (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const ck = (s: Session) => cookieHeader(s.jar);

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanupE2eData(app);
    await app.close();
  });

  async function setup(tag: string): Promise<{ s: Session; classId: string }> {
    const s = await signup(app, tag);
    const res = await http()
      .post('/api/classes')
      .set('Cookie', ck(s))
      .send({ name: `Lớp ${tag}`, subject: 'toan', grade: '12' })
      .expect(201);
    return { s, classId: res.body.id };
  }

  function importNames(s: Session, classId: string, names: string[]) {
    return http()
      .post(`/api/classes/${classId}/students/import`)
      .set('Cookie', ck(s))
      .send({ names });
  }

  it('dán tên: trùng → hậu tố, added, sortOrder nối tiếp', async () => {
    const { s, classId } = await setup('roster-import');
    const first = await importNames(s, classId, ['Nam', '2. Nam', 'Bình']).expect(200);
    expect(first.body.added).toBe(3);
    expect(first.body.students.map((x: StudentRow) => x.name)).toEqual(['Nam', 'Nam (2)', 'Bình']);
    expect(first.body.students.map((x: StudentRow) => x.sortOrder)).toEqual([0, 1, 2]);

    const second = await importNames(s, classId, ['nam']).expect(200);
    expect(second.body.added).toBe(1);
    const last = second.body.students.at(-1) as StudentRow;
    expect(last.name).toBe('nam (3)');
    expect(last.sortOrder).toBe(3);
  });

  it('gói miễn phí 30 học sinh/giáo viên: quá → 403 kèm details; ?fit=1 chỉ nhập phần còn chỗ', async () => {
    const { s, classId } = await setup('roster-limit');
    const names = (n: number, prefix: string) =>
      Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`);
    expect((await importNames(s, classId, names(25, 'HS')).expect(200)).body.added).toBe(25);

    const over = await importNames(s, classId, names(10, 'Thêm')).expect(403);
    expect(over.body.code).toBe('LIMIT_STUDENTS');
    expect(over.body.details).toEqual({
      scope: 'teacher',
      limit: 30,
      current: 25,
      requested: 10,
      remaining: 5,
    });

    const fit = await http()
      .post(`/api/classes/${classId}/students/import?fit=1`)
      .set('Cookie', ck(s))
      .send({ names: names(10, 'Thêm') })
      .expect(200);
    expect(fit.body.added).toBe(5);
    expect(fit.body.skipped).toBe(5);
    expect(fit.body.students.map((x: StudentRow) => x.name).slice(-5)).toEqual(names(5, 'Thêm'));

    // Giới hạn tính theo giáo viên: lớp thứ hai cũng hết chỗ, fit không cứu được khi còn 0
    const c2 = (
      await http()
        .post('/api/classes')
        .set('Cookie', ck(s))
        .send({ name: 'Lớp 2', subject: 'toan', grade: '11' })
        .expect(201)
    ).body as { id: string };
    const full = await importNames(s, c2.id, ['Một']).expect(403);
    expect(full.body.details).toMatchObject({ scope: 'teacher', remaining: 0 });
    await http()
      .post(`/api/classes/${c2.id}/students/import?fit=1`)
      .set('Cookie', ck(s))
      .send({ names: ['Một'] })
      .expect(403);

    const limits = await http().get('/api/limits').set('Cookie', ck(s)).expect(200);
    expect(limits.body).toMatchObject({
      maxStudentsPerTeacher: 30,
      usage: { classes: 2, students: 30 },
    });
  });

  it('nhập Excel có tiêu đề và SĐT phụ huynh', async () => {
    const { s, classId } = await setup('roster-excel');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('DS');
    ws.addRow(['STT', 'Họ và tên', 'SĐT phụ huynh']);
    ws.addRow([1, 'Nguyễn Văn An', '0901234567']);
    ws.addRow([2, 'Trần Thị Bình', '']);
    ws.addRow([3, 'Nguyễn Văn An', '0909999999']);
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());

    const res = await http()
      .post(`/api/classes/${classId}/students/import-excel`)
      .set('Cookie', ck(s))
      .attach('file', buffer, 'danh-sach.xlsx')
      .expect(200);
    expect(res.body.added).toBe(3);
    expect(res.body.students.map((x: StudentRow) => [x.name, x.parentPhone])).toEqual([
      ['Nguyễn Văn An', '0901234567'],
      ['Trần Thị Bình', null],
      ['Nguyễn Văn An (2)', '0909999999'],
    ]);
  });

  it('tải file mẫu rồi nhập lại với đủ cột; sửa từng trường', async () => {
    const { s, classId } = await setup('roster-template');
    const tpl = await http()
      .get(`/api/classes/${classId}/students/template.xlsx`)
      .set('Cookie', ck(s))
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(tpl.headers['content-type']).toContain('spreadsheetml');
    expect(tpl.headers['content-disposition']).toContain('.xlsx');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(tpl.body as unknown as ExcelJS.Buffer);
    const ws = wb.getWorksheet('Danh sách')!;
    expect(ws.getRow(1).getCell(2).value).toBe('Họ và tên (bắt buộc)');
    expect(ws.getRow(1).getCell(3).value).toBe('Mã học sinh (tùy chọn)');
    ws.addRow([
      1,
      'Nguyễn Văn An',
      'HS001',
      '15/08/2008',
      'Nam',
      '0912345678',
      'an@example.com',
      'THPT A',
      'Nguyễn Văn Bình',
      '0987654321',
      'Ghi chú',
    ]);
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const res = await http()
      .post(`/api/classes/${classId}/students/import-excel`)
      .set('Cookie', ck(s))
      .attach('file', buffer, 'mau.xlsx')
      .expect(200);
    expect(res.body.added).toBe(1);
    expect(res.body.students[0]).toMatchObject({
      name: 'Nguyễn Văn An',
      studentCode: 'HS001',
      dateOfBirth: '2008-08-15',
      gender: 'nam',
      phone: '0912345678',
      email: 'an@example.com',
      school: 'THPT A',
      parentName: 'Nguyễn Văn Bình',
      parentPhone: '0987654321',
      note: 'Ghi chú',
    });

    const id = (res.body.students[0] as StudentRow).id;
    await http()
      .patch(`/api/classes/${classId}/students/${id}`)
      .set('Cookie', ck(s))
      .send({ dateOfBirth: '2008-02-30' })
      .expect(400);
    await http()
      .patch(`/api/classes/${classId}/students/${id}`)
      .set('Cookie', ck(s))
      .send({ gender: 'khac-la' })
      .expect(400);
    const upd = await http()
      .patch(`/api/classes/${classId}/students/${id}`)
      .set('Cookie', ck(s))
      .send({ gender: '', email: '', dateOfBirth: '2008-02-29', note: 'Mới' })
      .expect(200);
    expect(upd.body).toMatchObject({
      gender: null,
      email: null,
      dateOfBirth: '2008-02-29',
      note: 'Mới',
    });
  });

  it('file không phải .xlsx → 400', async () => {
    const { s, classId } = await setup('roster-badfile');
    await http()
      .post(`/api/classes/${classId}/students/import-excel`)
      .set('Cookie', ck(s))
      .attach('file', Buffer.from('ten1\nten2'), 'ds.csv')
      .expect(400);
    await http()
      .post(`/api/classes/${classId}/students/import-excel`)
      .set('Cookie', ck(s))
      .expect(400);
  });

  it('sửa tên (trùng tên khác → hậu tố), SĐT, xóa mềm, sắp xếp lại', async () => {
    const { s, classId } = await setup('roster-edit');
    const imported = await importNames(s, classId, ['An', 'Bình', 'Châu']).expect(200);
    const [an, binh, chau] = imported.body.students as StudentRow[];

    const renamed = await http()
      .patch(`/api/classes/${classId}/students/${chau!.id}`)
      .set('Cookie', ck(s))
      .send({ name: 'An', parentPhone: '0912345678' })
      .expect(200);
    expect(renamed.body.name).toBe('An (2)');
    expect(renamed.body.parentPhone).toBe('0912345678');

    const sameName = await http()
      .patch(`/api/classes/${classId}/students/${an!.id}`)
      .set('Cookie', ck(s))
      .send({ name: 'an' })
      .expect(200);
    expect(sameName.body.name).toBe('an');

    await http()
      .delete(`/api/classes/${classId}/students/${binh!.id}`)
      .set('Cookie', ck(s))
      .expect(204);
    const detail = await http().get(`/api/classes/${classId}`).set('Cookie', ck(s)).expect(200);
    expect(detail.body.students.map((x: StudentRow) => x.id)).toEqual([an!.id, chau!.id]);

    const reordered = await http()
      .post(`/api/classes/${classId}/students/reorder`)
      .set('Cookie', ck(s))
      .send({ ids: [chau!.id, an!.id] })
      .expect(200);
    expect(reordered.body.map((x: StudentRow) => [x.id, x.sortOrder])).toEqual([
      [chau!.id, 0],
      [an!.id, 1],
    ]);

    await http()
      .post(`/api/classes/${classId}/students/reorder`)
      .set('Cookie', ck(s))
      .send({ ids: [chau!.id] })
      .expect(400);

    await http()
      .patch(`/api/classes/${classId}/students/${binh!.id}`)
      .set('Cookie', ck(s))
      .send({ name: 'Bình 2' })
      .expect(404);
  });

  it('lớp đã xóa mềm → 404 khi nhập', async () => {
    const { s, classId } = await setup('roster-deleted');
    await http().delete(`/api/classes/${classId}`).set('Cookie', ck(s)).expect(204);
    await importNames(s, classId, ['X']).expect(404);
  });
});
