'use client';

import { type StudentDto, updateStudentSchema } from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { errorMessage } from '@/lib/api';
import { useUpdateStudent } from '@/lib/classes';
import { type FieldErrors, validate } from '@/lib/forms';
import { StudentFields, type StudentFormState, studentFormFromDto } from './student-form';

/** Hộp thoại sửa đầy đủ thông tin một học sinh; chỉ họ và tên là bắt buộc. */
export function StudentDetailDialog({
  classId,
  student,
  onClose,
}: {
  classId: string;
  student: StudentDto | null;
  onClose: () => void;
}) {
  if (!student) return null;
  return <StudentForm key={student.id} classId={classId} student={student} onClose={onClose} />;
}

function StudentForm({
  classId,
  student,
  onClose,
}: {
  classId: string;
  student: StudentDto;
  onClose: () => void;
}) {
  const t = useTranslations('StudentInfo');
  const tc = useTranslations('Common');
  const update = useUpdateStudent(classId);
  const [form, setForm] = useState<StudentFormState>(() => studentFormFromDto(student));
  const [errors, setErrors] = useState<FieldErrors>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validate(updateStudentSchema, form);
    if (v.errors) return setErrors(v.errors);
    setErrors({});
    try {
      await update.mutateAsync({ studentId: student.id, input: v.data });
      onClose();
    } catch {
      // lỗi hiển thị qua update.error
    }
  }

  return (
    <Dialog open onClose={onClose} title={t('title')} size="lg">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {update.isError && <Alert variant="error">{errorMessage(update.error)}</Alert>}
        <StudentFields
          form={form}
          errors={errors}
          onChange={(key, value) => {
            setForm((f) => ({ ...f, [key]: value }));
            setErrors((er) => (er[key] ? { ...er, [key]: '' } : er));
          }}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button type="submit" loading={update.isPending}>
            {tc('save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
