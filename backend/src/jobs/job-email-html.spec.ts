import { buildReportedEmailHtml, type JobEmailPayload } from './job-email-html';

describe('job-email-html location line (agency + station)', () => {
  const base: JobEmailPayload = {
    ticketNo: 'CM-SHF-2026-0001',
    issueSummary: 'ทดสอบ',
    province: 'กาญจนบุรี',
    district: 'เลาขวัญ',
    agency: 'ที่ทำการบ้านผู้ใหญ่บ้าน',
    location: 'หมู่ 13 หนองจิกน้ำดำ',
    fixEnvironmentLabel: null,
    jobTypeLabel: null,
    statusCode: 'PENDING',
    statusLabel: 'รอดำเนินการ',
    reporterName: 'ผู้แจ้ง',
    assigneeName: null,
    reportDateLabel: '1/1/2026',
    fixDateLabel: null,
    dashboardUrl: 'http://localhost/dashboard/jobs/1',
    publicStatusUrl: 'http://localhost/public/status?ticketNo=1',
  };

  it('includes agency and station in email body', () => {
    const { html } = buildReportedEmailHtml(base, '');
    expect(html).toContain('ที่ทำการบ้านผู้ใหญ่บ้าน');
    expect(html).toContain('หมู่ 13 หนองจิกน้ำดำ');
  });

  it('shows only location when agency is null (legacy job)', () => {
    const { html } = buildReportedEmailHtml({ ...base, agency: null }, '');
    expect(html).toContain('หมู่ 13 หนองจิกน้ำดำ');
    expect(html).not.toContain('ที่ทำการบ้านผู้ใหญ่บ้าน');
  });

  it('omits location suffix in subject when location is entirely null/empty', () => {
    const noLoc: JobEmailPayload = {
      ...base,
      province: null,
      district: null,
      agency: null,
      location: null,
    };
    const { subject } = buildReportedEmailHtml(noLoc, '');
    expect(subject).toBe('[แจ้งเหตุ] ใบแจ้งซ่อม CM-SHF-2026-0001');
    expect(subject).not.toContain('—');
  });

  it('renders หัวข้อเหตุขัดข้อง and รายละเอียดเพิ่มเติม when incidentCategoryLabel is provided', () => {
    const withCat: JobEmailPayload = {
      ...base,
      incidentCategoryLabel: 'เครื่องวิทยุรับสัญญาณไม่ได้',
      description: 'เปิดเครื่องแล้วเงียบ ไม่มีเสียงตอบรับ',
    };
    const { html } = buildReportedEmailHtml(withCat, '');
    expect(html).toContain('หัวข้อเหตุขัดข้อง');
    expect(html).toContain('เครื่องวิทยุรับสัญญาณไม่ได้');
    expect(html).toContain('รายละเอียดเพิ่มเติม');
    expect(html).toContain('เปิดเครื่องแล้วเงียบ ไม่มีเสียงตอบรับ');
  });

  it('renders หัวข้อเหตุขัดข้อง without รายละเอียดเพิ่มเติม when description is empty', () => {
    const withCatOnly: JobEmailPayload = {
      ...base,
      incidentCategoryLabel: 'เครื่องวิทยุรับสัญญาณไม่ได้',
      description: null,
    };
    const { html } = buildReportedEmailHtml(withCatOnly, '');
    expect(html).toContain('หัวข้อเหตุขัดข้อง');
    expect(html).toContain('เครื่องวิทยุรับสัญญาณไม่ได้');
    expect(html).not.toContain('รายละเอียดเพิ่มเติม');
  });

  it('renders เรื่อง / ข้อขัดข้อง for legacy jobs without incidentCategoryLabel', () => {
    const legacy: JobEmailPayload = {
      ...base,
      incidentCategoryLabel: null,
      issueSummary: 'กล้องวงจรปิดดับ',
    };
    const { html } = buildReportedEmailHtml(legacy, '');
    expect(html).toContain('เรื่อง / ข้อขัดข้อง');
    expect(html).toContain('กล้องวงจรปิดดับ');
  });
});
