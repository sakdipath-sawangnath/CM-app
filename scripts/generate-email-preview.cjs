const fs = require('fs');
const path = require('path');

function esc(s) {
  if (s == null || s === '') return '—';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusBadgeHtml(code, label) {
  const c = (code || '').toUpperCase();
  let bg = '#e2e8f0';
  let fg = '#334155';
  let border = '#cbd5e1';
  if (c === 'PENDING') {
    bg = '#fef3c7';
    fg = '#92400e';
    border = '#fcd34d';
  } else if (c === 'IN_PROGRESS') {
    bg = '#dbeafe';
    fg = '#1e40af';
    border = '#93c5fd';
  } else if (c === 'RESOLVED') {
    bg = '#d1fae5';
    fg = '#065f46';
    border = '#6ee7b7';
  } else if (c === 'CANCELLED') {
    bg = '#f1f5f9';
    fg = '#475569';
    border = '#cbd5e1';
  }
  return `<span style="display:inline-block;padding:5px 14px;border-radius:9999px;font-size:12px;font-weight:600;background:${bg};color:${fg};border:1px solid ${border};">${esc(label)}</span>`;
}

const TD_LABEL =
  'padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:700;width:38%;vertical-align:top;';
const TD_VALUE =
  'padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;vertical-align:top;';

function rowText(label, value) {
  return `<tr>
  <td style="${TD_LABEL}">${esc(label)}</td>
  <td style="${TD_VALUE}">${value}</td>
</tr>`;
}

function rowStatus(label, payload) {
  const badge = statusBadgeHtml(payload.statusCode, payload.statusLabel);
  return `<tr>
  <td style="${TD_LABEL.replace('top', 'middle')}">${esc(label)}</td>
  <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;vertical-align:middle;">${badge}</td>
</tr>`;
}

function formatLocationLine(p) {
  const place = [p.agency, p.location].filter(Boolean).join(' · ');
  return [p.province, p.district, place].filter(Boolean).join(' · ') || '—';
}

function wrapBody(opts) {
  const { brandingLogoUrl, accentTitle, subtitle, payload, extraRows = '' } = opts;
  const logoBlock =
    brandingLogoUrl && /^https?:\/\//i.test(brandingLogoUrl.trim())
      ? `<img src="${esc(brandingLogoUrl.trim())}" alt="Logo" width="160" style="max-width:200px;height:auto;display:block;margin:0 auto 20px;border:0;" />`
      : `<div style="text-align:center;font-size:20px;font-weight:700;color:#0369a1;letter-spacing:0.02em;margin-bottom:16px;">DTRS Maintenance</div>`;

  const loc = formatLocationLine(payload);

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px;border-radius:12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);text-align:left;">
          <tr>
            <td style="padding:28px 28px 12px;text-align:center;background:#ffffff;">
              ${logoBlock}
              <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;font-weight:700;">${esc(accentTitle)}</h1>
              <p style="margin:0;font-size:14px;color:#64748b;line-height:1.55;">${esc(subtitle)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
                ${rowText('เลขที่ใบแจ้ง', esc(payload.ticketNo))}
                ${
                  payload.incidentCategoryLabel
                    ? `${rowText('หัวข้อเหตุขัดข้อง', esc(payload.incidentCategoryLabel))}${
                        payload.description?.trim()
                          ? rowText('รายละเอียดเพิ่มเติม', esc(payload.description.trim()))
                          : ''
                      }`
                    : rowText('เรื่อง / ข้อขัดข้อง', esc(payload.issueSummary))
                }
                ${rowText('สถานที่', esc(loc))}
                ${rowText('ประเภทสถานที่', esc(payload.fixEnvironmentLabel))}
                ${rowText('ประเภทงาน', esc(payload.jobTypeLabel))}
                ${rowStatus('สถานะ', payload)}
                ${rowText('ผู้แจ้ง', esc(payload.reporterName))}
                ${rowText('ผู้รับผิดชอบ', esc(payload.assigneeName))}
                ${rowText('วันที่แจ้ง', esc(payload.reportDateLabel))}
                ${payload.fixDateLabel ? rowText('วันที่ปิดงาน', esc(payload.fixDateLabel)) : ''}
                ${extraRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 24px;background:#ffffff;">
              <p style="margin:0 0 12px;font-size:13px;color:#64748b;">ลิงก์ดำเนินการในระบบ</p>
              <a href="${esc(payload.dashboardUrl)}" style="display:inline-block;padding:12px 22px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">เปิดงานในระบบ</a>
              <p style="margin:16px 0 0;font-size:12px;color:#64748b;line-height:1.5;">ตรวจสอบสถานะแบบสาธารณะ:<br /><a href="${esc(payload.publicStatusUrl)}" style="color:#2563eb;word-break:break-all;">${esc(payload.publicStatusUrl)}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;border-top:1px solid #e2e8f0;background:#ffffff;">
              <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;text-align:center;">Forth Co., Ltd. · ระบบแจ้งซ่อม</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

// ข้อมูลตัวอย่างเคสเดียวกับในรูป Screenshot ของผู้ใช้
const sampleClosedUser = {
  ticketNo: 'CM-SHF-2026-0022',
  incidentCategoryLabel: 'เครื่องวิทยุรับสัญญาณไม่ได้',
  description: '', // ผู้แจ้งไม่ได้กรอกรายละเอียดเพิ่มเติม
  issueSummary: 'เครื่องวิทยุรับสัญญาณไม่ได้',
  province: 'นครราชสีมา',
  district: 'วังน้ำเขียว',
  agency: 'ศาลาประชาคม',
  location: 'หมู่ 5 คลองกุ่ม',
  fixEnvironmentLabel: 'Indoor (ในอาคาร)',
  jobTypeLabel: 'Hardware (ฮาร์ดแวร์)',
  statusCode: 'RESOLVED',
  statusLabel: 'แล้วเสร็จ',
  reporterName: 'ศักดิภัท สว่างเนตร',
  assigneeName: 'นายอุทัย หาดสำโรง',
  reportDateLabel: '19/10/2569 00:00:00',
  fixDateLabel: '20/10/2569 10:59:19',
  dashboardUrl: 'http://localhost:3000/dashboard/jobs/22',
  publicStatusUrl: 'http://localhost:3000/public/status?ticketNo=CM-SHF-2026-0022',
};

const sampleReportedWithDesc = {
  ticketNo: 'CM-SHF-2026-0023',
  incidentCategoryLabel: 'เปิดเครื่องไม่ติดหรือระบบไฟขัดข้อง',
  description: 'เปิดสวิตช์เครื่องแล้วไฟเพาเวอร์ไม่ติด พัดลมไม่หมุน ตรวจสอบปลั๊กไฟแล้วมีกระแสไฟเข้าปกติ',
  issueSummary: 'เปิดเครื่องไม่ติดหรือระบบไฟขัดข้อง · เปิดสวิตช์เครื่องแล้วไฟเพาเวอร์ไม่ติด...',
  province: 'นครราชสีมา',
  district: 'เมืองนครราชสีมา',
  agency: 'สถานีตำรวจภูธร',
  location: 'เสาส่งสัญญาณหลัก',
  fixEnvironmentLabel: 'Outdoor (นอกอาคาร)',
  jobTypeLabel: 'Hardware (ฮาร์ดแวร์)',
  statusCode: 'PENDING',
  statusLabel: 'รอดำเนินการ',
  reporterName: 'ศักดิภัท สว่างเนตร',
  assigneeName: null,
  reportDateLabel: '20/10/2569 11:30:00',
  fixDateLabel: null,
  dashboardUrl: 'http://localhost:3000/dashboard/jobs/23',
  publicStatusUrl: 'http://localhost:3000/public/status?ticketNo=CM-SHF-2026-0023',
};

const email1 = wrapBody({
  brandingLogoUrl: '',
  accentTitle: 'ปิดงานเรียบร้อย',
  subtitle: 'งานแจ้งซ่อมของท่านได้ปิดและบันทึกผลแล้ว',
  payload: sampleClosedUser,
});

const email2 = wrapBody({
  brandingLogoUrl: '',
  accentTitle: 'ได้รับเรื่องแจ้งซ่อมแล้ว',
  subtitle: 'ระบบบันทึกคำร้องของท่านเรียบร้อย',
  payload: sampleReportedWithDesc,
});

const fullHtml = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>DTRS Email Notification - Local Preview</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 30px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #f8fafc;
    }
    .header {
      max-width: 900px;
      margin: 0 auto 24px;
      padding: 20px 24px;
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .title h2 { margin: 0 0 6px; font-size: 20px; color: #38bdf8; }
    .title p { margin: 0; font-size: 13px; color: #94a3b8; }
    .tabs { display: flex; gap: 8px; }
    .tab-btn {
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.15);
      background: #1e293b;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn:hover { background: #334155; color: #ffffff; }
    .tab-btn.active {
      background: #0284c7;
      color: #ffffff;
      border-color: #38bdf8;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);
    }
    .preview-container {
      max-width: 650px;
      margin: 0 auto;
    }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .badge-diff {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      margin-left: 8px;
    }
    .badge-diff.fixed { background: #065f46; color: #34d399; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">
      <h2>ตัวอย่างอีเมลแจ้งเตือน (Local Web Preview)</h2>
      <p>จำลองการแสดงผลอีเมลจริงตามที่แก้ไขแล้วใน <code>job-email-html.ts</code></p>
    </div>
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('tab1', this)">เคสปิดงาน (รูป CM-SHF-2026-0022)</button>
      <button class="tab-btn" onclick="switchTab('tab2', this)">เคสแจ้งเหตุ (มีรายละเอียดเพิ่มเติม)</button>
    </div>
  </div>

  <div class="preview-container">
    <div id="tab1" class="tab-content active">
      ${email1}
    </div>
    <div id="tab2" class="tab-content">
      ${email2}
    </div>
  </div>

  <script>
    function switchTab(tabId, btn) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }
  </script>
</body>
</html>`;

const outPath = path.join(__dirname, '..', 'docs', 'email-preview.html');
fs.writeFileSync(outPath, fullHtml, 'utf8');
console.log('Preview generated successfully at:', outPath);
