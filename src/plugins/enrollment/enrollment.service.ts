import { prisma } from '../../lib/prisma.js';
import crypto from 'crypto';
import { AppError } from '../../lib/errors.js';

export const EnrollmentService = {
  async generateInviteCode(professorId: string) {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // Expires in 48h

    return prisma.inviteCode.create({
      data: {
        code,
        professorId,
        expiresAt,
      }
    });
  },

  async joinWithCode(studentId: string, code: string) {
    const invite = await prisma.inviteCode.findUnique({ where: { code } });
    
    if (!invite || invite.expiresAt < new Date()) {
      throw new AppError(400, 'INVALID_CODE', 'Invalid or expired code');
    }

    try {
      return await prisma.enrollment.create({
        data: {
          professorId: invite.professorId,
          studentId,
          inviteCodeId: invite.id
        }
      });
    } catch (error) {
      throw new AppError(409, 'ALREADY_ENROLLED', 'Student is already enrolled');
    }
  },

  async getStudents(professorId: string) {
    return prisma.enrollment.findMany({
      where: { professorId, active: true },
      include: { student: true }
    });
  },

  async getProfessor(studentId: string) {
    return prisma.enrollment.findFirst({
      where: { studentId, active: true },
      include: { professor: true }
    });
  },

  async unenroll(enrollmentId: string, userId: string, role: string) {
    const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new AppError(404, 'NOT_FOUND', 'Enrollment not found');

    if (role === 'PROFESSOR' && enrollment.professorId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Cannot remove this student');
    }
    if (role === 'ALUNO' && enrollment.studentId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Cannot remove this enrollment');
    }

    return prisma.enrollment.delete({ where: { id: enrollmentId } });
  }
};
