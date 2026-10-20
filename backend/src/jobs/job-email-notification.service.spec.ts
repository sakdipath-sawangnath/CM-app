import { Test, TestingModule } from '@nestjs/testing';
import { JobEmailNotificationService } from './job-email-notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { MailService } from '../settings/mail.service';
import { JobsPdfService } from './jobs-pdf.service';

describe('JobEmailNotificationService', () => {
  let service: JobEmailNotificationService;
  let prisma: {
    job: { findUnique: jest.Mock };
    user: { findMany: jest.Mock };
  };
  let settingsService: {
    getEmailTemplates: jest.Mock;
    getEmailSmtpConfigForSending: jest.Mock;
  };
  let mailService: {
    sendHtmlMail: jest.Mock;
  };
  let jobsPdfService: {
    generateReportPdf: jest.Mock;
  };

  const mockSmtp = {
    smtpHost: 'smtp.example.com',
    smtpPort: '587',
    username: 'user@example.com',
    password: 'mock_password',
    secure: false,
    from: 'support@forth.co.th',
  };

  const defaultTemplates = {
    publicBaseUrl: 'https://dtrs-app.forth.co.th',
    brandingLogoUrl: '',
    onReported: {
      enabled: true,
      toExtra: [],
      cc: ['supervisor@forth.co.th'],
      notifyRoleIds: [1],
    },
    onAssigned: {
      enabled: true,
      toExtra: [],
      cc: ['manager@forth.co.th'],
      notifyRoleIds: [],
    },
    onClosed: {
      enabled: true,
      toExtra: [],
      cc: ['admin@forth.co.th'],
      notifyRoleIds: [1],
    },
  };

  const sampleJob = {
    id: 101,
    ticketNo: 'CM-SHF-2026-0101',
    requestTicketNo: 'RQ-CM-20260101',
    title: 'ทดสอบแจ้งซ่อม',
    incidentCategory: 'RADIO_RX_FAIL',
    description: 'รับสัญญาณไม่ได้เลย',
    status: 'PENDING',
    province: 'กรุงเทพมหานคร',
    district: 'พญาไท',
    agency: 'ฝ่ายเทคนิค',
    location: 'สถานีหลัก',
    fixEnvironment: null,
    brokenPart: null,
    reporterName: 'สมชาย ผู้แจ้ง',
    reporterEmail: 'somchai@example.com',
    reportDate: new Date('2026-10-20T10:00:00Z'),
    fixDate: null,
    reporter: { email: 'somchai@example.com' },
    assignedTo: { email: 'technician@example.com', name: 'สมศักดิ์ ช่างซ่อม' },
  };

  beforeEach(async () => {
    prisma = {
      job: {
        findUnique: jest.fn().mockResolvedValue(sampleJob),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ email: 'role-user@forth.co.th' }]),
      },
    };

    settingsService = {
      getEmailTemplates: jest.fn().mockResolvedValue(defaultTemplates),
      getEmailSmtpConfigForSending: jest.fn().mockResolvedValue(mockSmtp),
    };

    mailService = {
      sendHtmlMail: jest.fn().mockResolvedValue(undefined),
    };

    jobsPdfService = {
      generateReportPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobEmailNotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: SettingsService, useValue: settingsService },
        { provide: MailService, useValue: mailService },
        { provide: JobsPdfService, useValue: jobsPdfService },
      ],
    }).compile();

    service = module.get<JobEmailNotificationService>(
      JobEmailNotificationService,
    );
  });

  describe('notifyReported', () => {
    it('sends email to reporter (To) and supervisor/roles (CC) with category in issueSummary', async () => {
      await service.notifyReported(101);

      expect(mailService.sendHtmlMail).toHaveBeenCalledTimes(1);
      const call = mailService.sendHtmlMail.mock.calls[0];
      expect(call[0]).toEqual(mockSmtp);
      expect(call[1].to).toEqual(['somchai@example.com']);
      expect(call[1].cc).toEqual([
        'supervisor@forth.co.th',
        'role-user@forth.co.th',
      ]);
      expect(call[1].html).toContain('หัวข้อเหตุขัดข้อง');
      expect(call[1].html).toContain('เครื่องวิทยุรับสัญญาณไม่ได้');
      expect(call[1].html).toContain('รายละเอียดเพิ่มเติม');
      expect(call[1].html).toContain('รับสัญญาณไม่ได้เลย');
    });

    it('promotes CC to To when reporter does not provide email, so staff still receive notification', async () => {
      prisma.job.findUnique.mockResolvedValue({
        ...sampleJob,
        reporterEmail: null,
        reporter: null,
      });

      await service.notifyReported(101);

      expect(mailService.sendHtmlMail).toHaveBeenCalledTimes(1);
      const call = mailService.sendHtmlMail.mock.calls[0];
      expect(call[1].to).toEqual([
        'supervisor@forth.co.th',
        'role-user@forth.co.th',
      ]);
      expect(call[1].cc).toBeUndefined();
    });

    it('skips sending when template is disabled', async () => {
      settingsService.getEmailTemplates.mockResolvedValue({
        ...defaultTemplates,
        onReported: { ...defaultTemplates.onReported, enabled: false },
      });

      await service.notifyReported(101);
      expect(mailService.sendHtmlMail).not.toHaveBeenCalled();
    });
  });

  describe('notifyAssigned', () => {
    it('sends assignment email to technician (To) and CC recipients', async () => {
      await service.notifyAssigned(101);

      expect(mailService.sendHtmlMail).toHaveBeenCalledTimes(1);
      const call = mailService.sendHtmlMail.mock.calls[0];
      expect(call[1].to).toEqual(['technician@example.com']);
      expect(call[1].cc).toEqual(['manager@forth.co.th']);
    });

    it('promotes CC to To when technician has no email', async () => {
      prisma.job.findUnique.mockResolvedValue({
        ...sampleJob,
        assignedTo: { email: null, name: 'สมศักดิ์ ช่างซ่อม' },
        fixerEmail: null,
      });

      await service.notifyAssigned(101);

      expect(mailService.sendHtmlMail).toHaveBeenCalledTimes(1);
      const call = mailService.sendHtmlMail.mock.calls[0];
      expect(call[1].to).toEqual(['manager@forth.co.th']);
    });
  });

  describe('notifyClosed', () => {
    it('sends email to reporter (without PDF) and separate email to CC (with PDF attachment)', async () => {
      prisma.job.findUnique.mockResolvedValue({
        ...sampleJob,
        status: 'RESOLVED',
        fixDate: new Date('2026-10-20T12:00:00Z'),
      });

      await service.notifyClosed(101, 'mock-jwt-token');

      expect(mailService.sendHtmlMail).toHaveBeenCalledTimes(2);

      // 1) Email to reporter without PDF
      const email1 = mailService.sendHtmlMail.mock.calls[0][1];
      expect(email1.to).toEqual(['somchai@example.com']);
      expect(email1.attachments).toBeUndefined();

      // 2) Email to CC recipients with PDF attachment
      const email2 = mailService.sendHtmlMail.mock.calls[1][1];
      expect(email2.to).toEqual([
        'admin@forth.co.th',
        'role-user@forth.co.th',
      ]);
      expect(email2.attachments).toHaveLength(1);
      expect(email2.attachments[0].filename).toBe('DTRS-CM-SHF-2026-0101.pdf');
    });

    it('still sends PDF email to CC even when reporter has no email address', async () => {
      prisma.job.findUnique.mockResolvedValue({
        ...sampleJob,
        reporterEmail: null,
        reporter: null,
        status: 'RESOLVED',
        fixDate: new Date('2026-10-20T12:00:00Z'),
      });

      await service.notifyClosed(101, 'mock-jwt-token');

      // Reporter email skipped, but CC email with PDF was sent!
      expect(mailService.sendHtmlMail).toHaveBeenCalledTimes(1);
      const email = mailService.sendHtmlMail.mock.calls[0][1];
      expect(email.to).toEqual([
        'admin@forth.co.th',
        'role-user@forth.co.th',
      ]);
      expect(email.attachments).toHaveLength(1);
    });
  });
});
