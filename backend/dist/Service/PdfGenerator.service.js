"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PdfGeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const PDF_TEMPLATES = {
    executive_proposal: (d) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a2e}
  .cover{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);color:#fff;padding:60px 50px;min-height:240px;position:relative}
  .cover h1{font-size:32px;font-weight:800;letter-spacing:-0.5px;margin-bottom:8px}
  .cover .sub{font-size:14px;opacity:0.75;margin-bottom:30px}
  .cover .badge{display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);padding:4px 14px;border-radius:20px;font-size:12px;backdrop-filter:blur(4px)}
  .logo{position:absolute;top:40px;right:50px;font-size:22px;font-weight:900;letter-spacing:-1px;color:#e94560}
  .body{padding:40px 50px}
  .section{margin-bottom:30px}
  .section h2{font-size:15px;font-weight:700;color:#0f3460;border-bottom:2px solid #e94560;padding-bottom:6px;margin-bottom:16px;text-transform:uppercase;letter-spacing:0.5px}
  .row{display:flex;justify-content:space-between;gap:20px;margin-bottom:12px}
  .field{flex:1}
  .field label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px}
  .field span{font-size:14px;color:#1a1a2e;font-weight:600}
  .summary-box{background:#f8f9ff;border-left:4px solid #0f3460;padding:16px 20px;border-radius:0 8px 8px 0;font-size:13px;line-height:1.7;color:#333}
  .footer{background:#f8f9ff;border-top:3px solid #e94560;padding:20px 50px;font-size:11px;color:#888;display:flex;justify-content:space-between}
  .cta{background:linear-gradient(135deg,#e94560,#0f3460);color:#fff;padding:16px 24px;border-radius:10px;margin-top:20px}
  .cta h3{font-size:16px;margin-bottom:6px}
  .cta p{font-size:12px;opacity:0.85}
  .cta a{color:#ffd700;font-weight:700}
</style>
</head>
<body>
<div class="cover">
  <div class="logo">Sharyx AI</div>
  <div class="badge">Executive Proposal</div>
  <h1>Business Proposal</h1>
  <p class="sub">Prepared exclusively for ${d.leadName || "Valued Client"}${d.company ? " · " + d.company : ""}</p>
  <p style="font-size:12px;opacity:0.6">${d.date || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
</div>
<div class="body">
  <div class="section">
    <h2>Lead Details</h2>
    <div class="row">
      <div class="field"><label>Name</label><span>${d.leadName || "—"}</span></div>
      <div class="field"><label>Company</label><span>${d.company || "—"}</span></div>
    </div>
    <div class="row">
      <div class="field"><label>Phone</label><span>${d.phone || "—"}</span></div>
      <div class="field"><label>Email</label><span>${d.email || "—"}</span></div>
    </div>
    ${d.jobTitle ? `<div class="row"><div class="field"><label>Role / Title</label><span>${d.jobTitle}</span></div><div class="field"></div></div>` : ""}
  </div>
  <div class="section">
    <h2>Call Outcome</h2>
    <div class="row">
      <div class="field"><label>Outcome</label><span>${d.outcome || "Interested"}</span></div>
      <div class="field"><label>Agent</label><span>${d.agentName || "Sharyx AI"}</span></div>
    </div>
    ${d.dealValue ? `<div class="row"><div class="field"><label>Deal Value</label><span>${d.currency || "INR"} ${d.dealValue}</span></div><div class="field"></div></div>` : ""}
  </div>
  ${d.callSummary ? `<div class="section"><h2>Call Summary</h2><div class="summary-box">${d.callSummary}</div></div>` : ""}
  ${d.meetUrl ? `<div class="cta"><h3>🗓️ Schedule Your Demo</h3><p>Ready to explore Sharyx AI CRM for your business?</p><p style="margin-top:8px"><a href="${d.meetUrl}">${d.meetUrl}</a></p></div>` : ""}
</div>
<div class="footer">
  <span>Sharyx AI · Workforce Automation Platform</span>
  <span>${d.date || new Date().toLocaleDateString()}</span>
  <span>Confidential — For ${d.leadName || "Recipient"} Only</span>
</div>
</body>
</html>`,
    corporate_gold: (d) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Georgia,'Times New Roman',serif;background:#fff;color:#2c2c2c}
  .header{background:#1c1c1c;padding:40px 50px;color:#fff;border-bottom:4px solid #c9a84c}
  .header h1{font-size:28px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px}
  .header p{font-size:13px;color:#c9a84c;letter-spacing:1px}
  .gold-stripe{height:6px;background:linear-gradient(90deg,#c9a84c,#f5d47a,#c9a84c)}
  .body{padding:40px 50px}
  h2{font-size:14px;color:#c9a84c;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1px solid #e8d5a3;padding-bottom:8px;margin-bottom:16px;margin-top:28px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 30px;margin-bottom:16px}
  .item label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:3px}
  .item span{font-size:14px;font-weight:700;color:#1c1c1c}
  .summary{background:#faf8f2;border:1px solid #e8d5a3;padding:20px;font-size:13px;line-height:1.8;border-radius:4px}
  .footer{border-top:4px solid #c9a84c;padding:16px 50px;display:flex;justify-content:space-between;font-size:10px;color:#888;background:#faf8f2}
</style>
</head>
<body>
<div class="header">
  <h1>Sharyx Corporate Proposal</h1>
  <p>Premium Enterprise Solutions — Prepared for ${d.leadName || "Distinguished Client"}${d.company ? " · " + d.company : ""}</p>
</div>
<div class="gold-stripe"></div>
<div class="body">
  <h2>Recipient Profile</h2>
  <div class="grid">
    <div class="item"><label>Name</label><span>${d.leadName || "—"}</span></div>
    <div class="item"><label>Organisation</label><span>${d.company || "—"}</span></div>
    <div class="item"><label>Contact</label><span>${d.phone || "—"}</span></div>
    <div class="item"><label>Email</label><span>${d.email || "—"}</span></div>
    ${d.jobTitle ? `<div class="item"><label>Designation</label><span>${d.jobTitle}</span></div>` : ""}
  </div>
  <h2>Engagement Details</h2>
  <div class="grid">
    <div class="item"><label>Engagement Outcome</label><span>${d.outcome || "Interested"}</span></div>
    <div class="item"><label>Account Manager</label><span>${d.agentName || "Sharyx Team"}</span></div>
    ${d.dealValue ? `<div class="item"><label>Proposed Value</label><span>${d.currency || "INR"} ${d.dealValue}</span></div>` : ""}
    <div class="item"><label>Date</label><span>${d.date || new Date().toLocaleDateString()}</span></div>
  </div>
  ${d.callSummary ? `<h2>Engagement Summary</h2><div class="summary">${d.callSummary}</div>` : ""}
  ${d.meetUrl ? `<h2>Next Steps</h2><p style="font-size:13px;line-height:1.8">Schedule a personalised consultation: <strong>${d.meetUrl}</strong></p>` : ""}
</div>
<div class="footer">
  <span>SHARYX AI — ENTERPRISE WORKFORCE PLATFORM</span>
  <span>Strictly Confidential</span>
  <span>${d.date || new Date().toLocaleDateString()}</span>
</div>
</body>
</html>`,
    call_summary: (d) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f6f8ff;color:#1a1a2e}
  .header{background:#fff;padding:30px 40px;border-bottom:3px solid #6366f1;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
  .header h1{font-size:22px;font-weight:800;color:#1a1a2e}
  .header p{font-size:12px;color:#6b7280;margin-top:4px}
  .tag{display:inline-block;background:#6366f1;color:#fff;padding:3px 10px;border-radius:20px;font-size:11px;margin-top:8px}
  .body{padding:30px 40px}
  .card{background:#fff;border-radius:12px;padding:24px;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,0.06)}
  .card h2{font-size:13px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:14px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px}
  .item label{font-size:10px;color:#9ca3af;display:block;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.5px}
  .item span{font-size:13px;font-weight:600;color:#111827}
  .outcome-chip{display:inline-block;background:#dcfce7;color:#166534;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700;margin-top:6px}
  .summary{background:#f8f9ff;border-left:4px solid #6366f1;padding:16px;border-radius:0 8px 8px 0;font-size:13px;line-height:1.8;color:#374151}
  .footer{text-align:center;font-size:10px;color:#9ca3af;padding:20px 40px}
</style>
</head>
<body>
<div class="header">
  <h1>Call Summary Report</h1>
  <p>Auto-generated by Sharyx AI · ${d.date || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
  <span class="tag">Sharyx AI · Internal Record</span>
</div>
<div class="body">
  <div class="card">
    <h2>Lead / Contact</h2>
    <div class="grid">
      <div class="item"><label>Name</label><span>${d.leadName || "Unknown"}</span></div>
      <div class="item"><label>Company</label><span>${d.company || "—"}</span></div>
      <div class="item"><label>Phone</label><span>${d.phone || "—"}</span></div>
      <div class="item"><label>Email</label><span>${d.email || "—"}</span></div>
    </div>
  </div>
  <div class="card">
    <h2>Call Result</h2>
    <div class="grid">
      <div class="item"><label>Outcome</label><span class="outcome-chip">${d.outcome || "Completed"}</span></div>
      <div class="item"><label>Agent</label><span>${d.agentName || "AI Agent"}</span></div>
      ${d.dealValue ? `<div class="item"><label>Deal Value</label><span>${d.currency || "INR"} ${d.dealValue}</span></div>` : ""}
    </div>
  </div>
  ${d.callSummary ? `<div class="card"><h2>AI-Generated Summary</h2><div class="summary">${d.callSummary}</div></div>` : ""}
  ${d.meetUrl ? `<div class="card"><h2>Follow-Up Action</h2><p style="font-size:13px">Demo Meeting: <strong><a href="${d.meetUrl}" style="color:#6366f1">${d.meetUrl}</a></strong></p></div>` : ""}
</div>
<div class="footer">Generated by Sharyx AI Automation Platform · Confidential</div>
</body>
</html>`,
    candidate_report: (d) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;background:#fff}
  .header{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:40px 50px}
  .header h1{font-size:26px;font-weight:800;margin-bottom:4px}
  .header p{font-size:13px;opacity:0.8}
  .body{padding:40px 50px}
  h2{font-size:13px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #ede9fe;padding-bottom:6px;margin:24px 0 14px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin-bottom:8px}
  .item label{font-size:10px;color:#9ca3af;display:block;margin-bottom:3px;text-transform:uppercase}
  .item span{font-size:13px;font-weight:600}
  .badge{display:inline-block;background:#ede9fe;color:#5b21b6;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:700}
  .notes{background:#faf5ff;border-left:4px solid #7c3aed;padding:14px;font-size:13px;line-height:1.7}
  .footer{border-top:2px solid #ede9fe;padding:16px 50px;font-size:10px;color:#9ca3af;display:flex;justify-content:space-between}
</style>
</head>
<body>
<div class="header">
  <h1>Candidate Report</h1>
  <p>Recruitment Screening · Sharyx Talent Team · ${d.date || new Date().toLocaleDateString()}</p>
</div>
<div class="body">
  <h2>Candidate Information</h2>
  <div class="grid">
    <div class="item"><label>Full Name</label><span>${d.leadName || "—"}</span></div>
    <div class="item"><label>Applied Role</label><span>${d.jobTitle || "—"}</span></div>
    <div class="item"><label>Phone</label><span>${d.phone || "—"}</span></div>
    <div class="item"><label>Email</label><span>${d.email || "—"}</span></div>
    <div class="item"><label>Current Company</label><span>${d.company || "—"}</span></div>
  </div>
  <h2>Screening Outcome</h2>
  <div class="grid">
    <div class="item"><label>Interview Status</label><span class="badge">${d.outcome || "Screened"}</span></div>
    <div class="item"><label>Interviewer</label><span>${d.agentName || "HR Team"}</span></div>
  </div>
  ${d.callSummary ? `<h2>Screening Notes</h2><div class="notes">${d.callSummary}</div>` : ""}
  ${d.meetUrl ? `<h2>Interview Link</h2><p style="font-size:13px"><a href="${d.meetUrl}" style="color:#7c3aed">${d.meetUrl}</a></p>` : ""}
</div>
<div class="footer">
  <span>Sharyx Talent Platform</span><span>Confidential</span><span>${d.date || new Date().toLocaleDateString()}</span>
</div>
</body>
</html>`,
    invoice: (d) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;background:#fff}
  .header{padding:40px 50px;border-bottom:4px solid #059669;display:flex;justify-content:space-between;align-items:flex-start}
  .brand{font-size:24px;font-weight:900;color:#059669}
  .invoice-label{text-align:right}
  .invoice-label h2{font-size:28px;color:#111;font-weight:800}
  .invoice-label p{font-size:12px;color:#6b7280}
  .body{padding:30px 50px}
  .billing{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-bottom:30px}
  .billing h3{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#059669;margin-bottom:10px}
  .billing p{font-size:13px;color:#374151;line-height:1.8}
  .table{width:100%;border-collapse:collapse;margin-bottom:24px}
  .table th{background:#f0fdf4;padding:10px 14px;font-size:11px;text-align:left;color:#059669;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #059669}
  .table td{padding:12px 14px;font-size:13px;border-bottom:1px solid #f0f0f0}
  .total-row td{font-weight:800;font-size:15px;color:#059669;border-top:2px solid #059669}
  .footer{border-top:2px solid #f0f0f0;padding:20px 50px;font-size:11px;color:#9ca3af;text-align:center}
</style>
</head>
<body>
<div class="header">
  <div class="brand">Sharyx AI</div>
  <div class="invoice-label">
    <h2>INVOICE</h2>
    <p>Date: ${d.date || new Date().toLocaleDateString()}</p>
  </div>
</div>
<div class="body">
  <div class="billing">
    <div>
      <h3>Bill To</h3>
      <p><strong>${d.leadName || "Client"}</strong><br/>${d.company || ""}<br/>${d.email || ""}<br/>${d.phone || ""}</p>
    </div>
    <div>
      <h3>From</h3>
      <p><strong>Sharyx AI Pvt Ltd</strong><br/>Workforce Automation Platform<br/>support@sharyx.com</p>
    </div>
  </div>
  <table class="table">
    <thead><tr><th>Description</th><th>Amount</th></tr></thead>
    <tbody>
      <tr><td>Sharyx AI Platform License — ${d.jobTitle || "Enterprise Plan"}</td><td>${d.currency || "INR"} ${d.dealValue || "0"}</td></tr>
      <tr class="total-row"><td>Total</td><td>${d.currency || "INR"} ${d.dealValue || "0"}</td></tr>
    </tbody>
  </table>
  ${d.callSummary ? `<p style="font-size:12px;color:#6b7280;line-height:1.7">${d.callSummary}</p>` : ""}
</div>
<div class="footer">Thank you for choosing Sharyx AI · ${d.date || new Date().toLocaleDateString()}</div>
</body>
</html>`,
    onboarding_kit: (d) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;background:#fff}
  .header{background:linear-gradient(135deg,#0ea5e9,#06b6d4);color:#fff;padding:50px;text-align:center}
  .header h1{font-size:30px;font-weight:900;margin-bottom:8px}
  .header p{font-size:14px;opacity:0.9}
  .body{padding:40px 50px}
  .welcome{font-size:18px;font-weight:700;color:#0ea5e9;margin-bottom:16px}
  .steps{counter-reset:step}
  .step{display:flex;gap:16px;margin-bottom:20px;align-items:flex-start}
  .step-num{background:#0ea5e9;color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0}
  .step-content h3{font-size:14px;font-weight:700;margin-bottom:4px;color:#0f172a}
  .step-content p{font-size:12px;color:#6b7280;line-height:1.6}
  .credentials{background:#f0f9ff;border:2px solid #0ea5e9;border-radius:10px;padding:20px 24px;margin:20px 0}
  .credentials h2{font-size:13px;color:#0ea5e9;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}
  .cred-row{display:flex;gap:8px;margin-bottom:8px;font-size:13px}
  .cred-row label{color:#6b7280;width:90px;flex-shrink:0}
  .cred-row span{font-weight:700;color:#0f172a}
  .footer{border-top:3px solid #0ea5e9;padding:20px 50px;text-align:center;font-size:11px;color:#9ca3af}
</style>
</head>
<body>
<div class="header">
  <h1>Welcome to Sharyx AI 🎉</h1>
  <p>Your onboarding kit — everything you need to get started</p>
</div>
<div class="body">
  <p class="welcome">Hi ${d.leadName || "Team"},</p>
  <p style="font-size:13px;color:#374151;margin-bottom:24px;line-height:1.8">
    We're thrilled to have ${d.company || "you"} on board! This kit has everything you need to hit the ground running with Sharyx AI CRM.
  </p>
  <div class="credentials">
    <h2>Your Account Details</h2>
    <div class="cred-row"><label>Account</label><span>${d.company || "—"}</span></div>
    <div class="cred-row"><label>Admin Email</label><span>${d.email || "—"}</span></div>
    <div class="cred-row"><label>Dashboard</label><span>${d.meetUrl || "https://app.sharyx.com"}</span></div>
    <div class="cred-row"><label>Support</label><span>support@sharyx.com</span></div>
  </div>
  <div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-content"><h3>Connect Your WhatsApp Business</h3><p>Link your Meta Business WABA account to enable AI auto-reply on WhatsApp.</p></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-content"><h3>Setup Your Email Mailbox</h3><p>Connect your SMTP/IMAP account for two-way email synchronization and AI drafting.</p></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-content"><h3>Import Your Leads</h3><p>Upload a CSV or connect via API/Zapier to start managing your pipeline.</p></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-content"><h3>Configure Your AI Copilot</h3><p>Set your tone, system prompt, and auto-reply rules for instant, personalized responses.</p></div></div>
  </div>
  ${d.callSummary ? `<p style="font-size:13px;color:#374151;margin-top:20px;line-height:1.8">${d.callSummary}</p>` : ""}
</div>
<div class="footer">
  Welcome to the Sharyx family · ${d.date || new Date().toLocaleDateString()} · Your dedicated CSM: ${d.agentName || "Sharyx Team"}
</div>
</body>
</html>`,
};
let PdfGeneratorService = PdfGeneratorService_1 = class PdfGeneratorService {
    constructor() {
        this.logger = new common_1.Logger(PdfGeneratorService_1.name);
    }
    async generate(pdfData) {
        const templateFn = PDF_TEMPLATES[pdfData.templateType];
        if (!templateFn) {
            throw new Error(`Unknown PDF template type: ${pdfData.templateType}`);
        }
        const html = templateFn(Object.assign(Object.assign({}, pdfData), { date: pdfData.date || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) }));
        try {
            const pkg = "puppeteer";
            const puppeteerModule = await (Function('m', 'return import(m)')(pkg)).catch(() => null);
            const puppeteer = (puppeteerModule === null || puppeteerModule === void 0 ? void 0 : puppeteerModule.default) || puppeteerModule;
            if (!puppeteer)
                throw new Error("puppeteer module not installed");
            const browser = await puppeteer.launch({
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
            });
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: "networkidle0" });
            const pdfBuffer = await page.pdf({
                format: "A4",
                printBackground: true,
                margin: { top: "0", bottom: "0", left: "0", right: "0" },
            });
            await browser.close();
            this.logger.log(`PDF generated via Puppeteer: ${pdfData.templateType} for ${pdfData.leadName}`);
            return Buffer.from(pdfBuffer);
        }
        catch (puppeteerErr) {
            this.logger.warn(`Puppeteer not available (${puppeteerErr.message}), falling back to HTML attachment`);
            return Buffer.from(html, "utf-8");
        }
    }
    getTemplateTypes() {
        return [
            { value: "executive_proposal", label: "Executive Proposal", description: "Dark premium dark-blue proposal for sales outreach" },
            { value: "corporate_gold", label: "Corporate Gold", description: "Formal serif gold-accent corporate proposal" },
            { value: "call_summary", label: "Call Summary Report", description: "Clean AI-generated call summary with outcome chips" },
            { value: "candidate_report", label: "Candidate Report", description: "Purple recruitment screening report" },
            { value: "invoice", label: "Invoice", description: "Green professional invoice with line items" },
            { value: "onboarding_kit", label: "Onboarding Kit", description: "Welcome kit with setup steps for new customers" },
        ];
    }
};
exports.PdfGeneratorService = PdfGeneratorService;
exports.PdfGeneratorService = PdfGeneratorService = PdfGeneratorService_1 = __decorate([
    (0, common_1.Injectable)()
], PdfGeneratorService);
//# sourceMappingURL=PdfGenerator.service.js.map