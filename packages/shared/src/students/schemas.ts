import { z } from 'zod';

export const pickNameSchema = z.object({
  studentId: z.string().min(1),
});
export type PickNameInput = z.infer<typeof pickNameSchema>;

export interface JoinInfoDto {
  class: { id: string; name: string; rosterLocked: boolean };
  students: { id: string; name: string; bound: boolean }[];
}

export interface StudentIdentityDto {
  studentId: string;
  name: string;
  classId: string;
  className: string;
  deviceId: string;
}

export interface PickNameResultDto {
  token: string;
  student: StudentIdentityDto;
}

export interface StudentMeDto {
  student: StudentIdentityDto;
  session: { id: string; status: 'active' | 'ended' } | null;
  run: { id: string; status: 'lobby' | 'in_progress' | 'finished' } | null;
}
