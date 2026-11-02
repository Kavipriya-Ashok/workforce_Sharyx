"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var JobOpeningsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobOpeningsService = void 0;
const common_1 = require("@nestjs/common");
const JobOpening_entity_1 = require("../../Database/Table/Lead/JobOpening.entity");
const lead_1 = require("../../Database/Table/Lead/lead");
let JobOpeningsService = JobOpeningsService_1 = class JobOpeningsService {
    constructor() {
        this.logger = new common_1.Logger(JobOpeningsService_1.name);
    }
    async ensureSeeded(tenantId = "default") {
        try {
            const count = await JobOpening_entity_1.JobOpening.count({ where: { tenant_id: tenantId } });
            if (count > 0)
                return;
            const anyCount = await JobOpening_entity_1.JobOpening.count();
            if (anyCount > 0)
                return;
            const defaults = [
                {
                    title: "Frontend Developer",
                    skills: ["React", "TypeScript", "TailwindCSS", "Next.js"],
                    min_experience: 2,
                    locations: ["Bengaluru", "Chennai"],
                    work_mode: "Hybrid",
                    relocation_supported: true,
                    status: "open",
                },
                {
                    title: "AI Solutions Engineer",
                    skills: ["Python", "Node.js", "LLM", "NLP"],
                    min_experience: 2,
                    locations: ["Chennai", "Bengaluru"],
                    work_mode: "Hybrid",
                    relocation_supported: true,
                    status: "open",
                },
                {
                    title: "Business Development Executive",
                    skills: ["B2B SaaS Sales", "Lead Generation", "CRM"],
                    min_experience: 1,
                    locations: ["Chennai"],
                    work_mode: "Onsite",
                    relocation_supported: true,
                    status: "open",
                },
            ];
            for (const d of defaults) {
                const op = new JobOpening_entity_1.JobOpening();
                op.tenant_id = tenantId;
                op.title = d.title;
                op.skills = d.skills;
                op.min_experience = d.min_experience;
                op.locations = d.locations;
                op.work_mode = d.work_mode;
                op.relocation_supported = d.relocation_supported;
                op.status = d.status;
                op.updated_by = "system";
                await op.save();
            }
        }
        catch (err) {
            this.logger.warn(`Could not seed job_openings: ${err.message}`);
        }
    }
    async listOpenings(tenantId = "default") {
        await this.ensureSeeded(tenantId);
        const rows = await JobOpening_entity_1.JobOpening.find({
            where: [{ tenant_id: tenantId }, { tenant_id: "default" }],
            order: { created_at: "ASC" },
        });
        const seen = new Set();
        return rows.filter((r) => {
            if (seen.has(r.id))
                return false;
            seen.add(r.id);
            return true;
        });
    }
    async getOpenRoles(tenantId = "default") {
        const all = await this.listOpenings(tenantId);
        return all.filter((r) => (r.status || "open").toLowerCase() === "open");
    }
    async createOpening(data, userId = "hr_admin", tenantId = "default") {
        if (!data.title || !String(data.title).trim()) {
            throw new common_1.BadRequestException("Role title is required");
        }
        const locations = Array.isArray(data.locations)
            ? data.locations.map((l) => String(l).trim()).filter(Boolean)
            : typeof data.locations === "string"
                ? String(data.locations)
                    .split(",")
                    .map((l) => l.trim())
                    .filter(Boolean)
                : [];
        if (locations.length === 0) {
            throw new common_1.BadRequestException("At least one location is required");
        }
        const skills = Array.isArray(data.skills)
            ? data.skills.map((s) => String(s).trim()).filter(Boolean)
            : typeof data.skills === "string"
                ? String(data.skills)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : [];
        const op = new JobOpening_entity_1.JobOpening();
        op.tenant_id = data.tenant_id || tenantId || "default";
        op.title = String(data.title).trim();
        op.skills = skills;
        op.min_experience = data.min_experience !== undefined && data.min_experience !== null ? Number(data.min_experience) || 0 : 0;
        op.locations = locations;
        op.work_mode = data.work_mode || "Hybrid";
        op.relocation_supported = data.relocation_supported !== undefined ? Boolean(data.relocation_supported) : true;
        op.status = (data.status || "open").toLowerCase() === "closed" ? "closed" : "open";
        op.updated_by = userId;
        return await op.save();
    }
    async updateOpening(id, data, userId = "hr_admin") {
        const op = await JobOpening_entity_1.JobOpening.findOne({ where: { id } });
        if (!op)
            throw new common_1.NotFoundException("Job opening not found");
        if (data.title !== undefined)
            op.title = String(data.title).trim();
        if (data.skills !== undefined) {
            op.skills = Array.isArray(data.skills)
                ? data.skills.map((s) => String(s).trim()).filter(Boolean)
                : typeof data.skills === "string"
                    ? String(data.skills)
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : [];
        }
        if (data.min_experience !== undefined) {
            op.min_experience = Number(data.min_experience) || 0;
        }
        if (data.locations !== undefined) {
            const locs = Array.isArray(data.locations)
                ? data.locations.map((l) => String(l).trim()).filter(Boolean)
                : typeof data.locations === "string"
                    ? String(data.locations)
                        .split(",")
                        .map((l) => l.trim())
                        .filter(Boolean)
                    : [];
            if (locs.length > 0)
                op.locations = locs;
        }
        if (data.work_mode !== undefined)
            op.work_mode = data.work_mode;
        if (data.relocation_supported !== undefined)
            op.relocation_supported = Boolean(data.relocation_supported);
        if (data.status !== undefined) {
            op.status = String(data.status).toLowerCase() === "closed" ? "closed" : "open";
        }
        op.updated_by = userId;
        op.updated_at = new Date();
        return await op.save();
    }
    async deleteOpening(id) {
        const op = await JobOpening_entity_1.JobOpening.findOne({ where: { id } });
        if (!op)
            throw new common_1.NotFoundException("Job opening not found");
        await op.remove();
        return { deleted: true };
    }
    async formatOpenRolesForPrompt(tenantId = "default") {
        const openRoles = await this.getOpenRoles(tenantId);
        if (openRoles.length === 0) {
            return {
                openRoles: [],
                promptBlock: `OPEN ROLES: None currently open. Inform the candidate politely that there are no active openings right now, and offer to keep their resume on file for upcoming positions.`,
                shortSummary: "No active openings right now",
            };
        }
        const lines = openRoles.map((r) => {
            const skillsStr = Array.isArray(r.skills) && r.skills.length ? r.skills.join(", ") : "General";
            const locsStr = Array.isArray(r.locations) && r.locations.length ? r.locations.join(", ") : "Flexible";
            const minExp = Number(r.min_experience) || 0;
            const relocStr = r.relocation_supported ? "Relocation supported" : "Local candidates preferred";
            return `- Role: "${r.title}" | Min Experience: ${minExp}+ years | Skills: [${skillsStr}] | Locations: [${locsStr}] | Work Mode: ${r.work_mode || "Hybrid"} (${relocStr})`;
        });
        const shortSummary = openRoles
            .map((r) => `${r.title} (${(r.locations || []).join("/")}, ${r.work_mode || "Hybrid"})`)
            .join("; ");
        const promptBlock = [
            `OPEN ROLES (LIVE FROM HR DATABASE — STRICTLY ONLY OFFER THESE 4 ROLES):`,
            ...lines,
            `DYNAMIC OPENINGS & LOCATION RULES (CRITICAL):`,
            `- ONLY mention roles listed in OPEN ROLES above. If the candidate asks for a role that is NOT listed above, state clearly that it is not open right now and offer the listed OPEN ROLES.`,
            `- STRICTLY FORBIDDEN: DO NOT invent roles such as "Software Development Engineer (SDE)", "DevOps", or "Data Scientist". Use ONLY the exact titles: ${openRoles.map((r) => `"${r.title}"`).join(", ")}.`,
            `- After the candidate picks a role, check that role's exact Locations and Work Mode from OPEN ROLES:`,
            `  • If the role has multiple cities (e.g. Chennai and Bengaluru), ask: "This role is in <City1> and <City2> (<Work Mode>). Which location do you prefer, and are you open to relocating?"`,
            `  • If the role has only one city (e.g. Chennai), ask: "This role is based in <City> (<Work Mode>). Are you okay to relocate to <City>?"`,
            `  • If the candidate asks for remote / work-from-home and the role's Work Mode is NOT Remote, state plainly that the role is <Work Mode> in <Locations> and ask if they can work from there.`,
            `- Save the chosen role ("role") and preferred location ("preferred_location" and "relocation") in memory.`,
        ].join("\n");
        return { openRoles, promptBlock, shortSummary };
    }
    getScheduleConfig() {
        const rawDays = process.env.INTERVIEW_WORKING_DAYS || "1,2,3,4,5,6";
        const workingDays = rawDays
            .split(",")
            .map((d) => parseInt(d.trim(), 10))
            .filter((d) => !isNaN(d));
        const startHour = parseInt(process.env.INTERVIEW_START_HOUR || "10", 10);
        const endHour = parseInt(process.env.INTERVIEW_END_HOUR || "18", 10);
        return { workingDays, startHour, endHour };
    }
    async getAvailableSlots(tenantId = "default", count = 4) {
        const { workingDays, startHour, endHour } = this.getScheduleConfig();
        const bookedKeys = new Set();
        try {
            const upcomingLeads = await lead_1.lead
                .createQueryBuilder("l")
                .select(["l.interview_date", "l.preferred_interview_slot"])
                .where("l.status = true AND (l.interview_date IS NOT NULL OR l.preferred_interview_slot IS NOT NULL)")
                .orderBy("l.updated_on", "DESC")
                .take(50)
                .getMany();
            for (const l of upcomingLeads) {
                if (l.interview_date) {
                    const d = new Date(l.interview_date);
                    if (!isNaN(d.getTime())) {
                        bookedKeys.add(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${d.getHours()}`);
                    }
                }
            }
        }
        catch (_a) { }
        const candidateHours = [11, 14, 16].filter((h) => h >= startHour && h < endHour);
        const results = [];
        const now = new Date();
        for (let dayOffset = 1; dayOffset <= 14 && results.length < count; dayOffset++) {
            const d = new Date(now.getTime() + dayOffset * 86400000);
            const dayOfWeek = d.getDay();
            if (!workingDays.includes(dayOfWeek))
                continue;
            for (const hr of candidateHours) {
                if (results.length >= count)
                    break;
                const slotDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hr, 0, 0, 0);
                if (slotDate.getTime() <= now.getTime() + 3600000)
                    continue;
                const key = `${slotDate.getFullYear()}-${slotDate.getMonth() + 1}-${slotDate.getDate()}-${hr}`;
                if (bookedKeys.has(key))
                    continue;
                const label = slotDate.toLocaleString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                });
                results.push(`${label} IST`);
            }
        }
        return results;
    }
    async validateInterviewSlot(slotInput, tenantId = "default") {
        const raw = (slotInput || "").trim();
        const availableSlots = await this.getAvailableSlots(tenantId, 4);
        const { workingDays, startHour, endHour } = this.getScheduleConfig();
        if (!raw) {
            return {
                valid: false,
                reason: "No interview date and time was provided.",
                availableSlots,
            };
        }
        const lower = raw.toLowerCase();
        if (/\bsunday\b/i.test(lower) && !workingDays.includes(0)) {
            return {
                valid: false,
                reason: "Sundays are outside our working days. Our interview schedule is Monday to Saturday, 10:00 AM to 6:00 PM IST.",
                availableSlots,
            };
        }
        let hours = null;
        let minutes = 0;
        const ampmMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
        if (ampmMatch) {
            let h = parseInt(ampmMatch[1], 10);
            minutes = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
            const mer = ampmMatch[3].toLowerCase();
            if (mer === "am") {
                if (h === 12)
                    h = 0;
            }
            else if (mer === "pm") {
                if (h < 12)
                    h += 12;
            }
            hours = h;
        }
        else {
            const milMatch = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
            if (milMatch) {
                hours = parseInt(milMatch[1], 10);
                minutes = parseInt(milMatch[2], 10);
            }
            else if (/\bmorning\b/i.test(lower)) {
                hours = 11;
            }
            else if (/\bafternoon\b/i.test(lower)) {
                hours = 14;
            }
            else if (/\bevening\b/i.test(lower)) {
                hours = 17;
            }
            else if (/\b(night|midnight)\b/i.test(lower)) {
                hours = 0;
            }
        }
        if (hours !== null) {
            const decimalHour = hours + minutes / 60;
            if (hours === 0 || decimalHour < startHour || decimalHour > endHour) {
                const displayTime = ampmMatch ? ampmMatch[0].toUpperCase() : `${hours}:${minutes.toString().padStart(2, "0")}`;
                return {
                    valid: false,
                    reason: `${displayTime} is outside our standard interview hours (Monday to Saturday, 10:00 AM – 6:00 PM IST).`,
                    availableSlots,
                };
            }
        }
        else {
            hours = 11;
        }
        const now = new Date();
        let targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
        let dateResolved = false;
        const dmyMatch = raw.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
        const ymdMatch = raw.match(/\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
        if (dmyMatch) {
            const day = parseInt(dmyMatch[1], 10);
            const month = parseInt(dmyMatch[2], 10) - 1;
            const year = parseInt(dmyMatch[3], 10);
            targetDate = new Date(year, month, day, hours, minutes, 0, 0);
            dateResolved = true;
        }
        else if (ymdMatch) {
            const year = parseInt(ymdMatch[1], 10);
            const month = parseInt(ymdMatch[2], 10) - 1;
            const day = parseInt(ymdMatch[3], 10);
            targetDate = new Date(year, month, day, hours, minutes, 0, 0);
            dateResolved = true;
        }
        else if (/\btomorrow\b/i.test(lower)) {
            targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hours, minutes, 0, 0);
            dateResolved = true;
        }
        else if (/\btoday\b/i.test(lower)) {
            targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
            dateResolved = true;
        }
        else {
            const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
            const monthRegex = new RegExp(`\\b(?:(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthNames.join("|")})[a-z]*|(${monthNames.join("|")})[a-z]*\\s+(\\d{1,2})(?:st|nd|rd|th)?)(?:[\\s,]+(\\d{4}))?\\b`, "i");
            const mMatch = lower.match(monthRegex);
            if (mMatch) {
                const day = parseInt(mMatch[1] || mMatch[4], 10);
                const monStr = (mMatch[2] || mMatch[3]).slice(0, 3).toLowerCase();
                const month = monthNames.indexOf(monStr);
                const year = mMatch[5] ? parseInt(mMatch[5], 10) : now.getFullYear();
                targetDate = new Date(year, month, day, hours, minutes, 0, 0);
                dateResolved = true;
            }
            else {
                const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                for (let i = 0; i < weekdays.length; i++) {
                    if (new RegExp(`\\b${weekdays[i]}\\b`, "i").test(lower)) {
                        const curDay = now.getDay();
                        const diff = (i - curDay + 7) % 7 || 7;
                        targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, hours, minutes, 0, 0);
                        dateResolved = true;
                        break;
                    }
                }
            }
        }
        if (!dateResolved) {
            let nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hours, minutes, 0, 0);
            while (!workingDays.includes(nextDay.getDay())) {
                nextDay = new Date(nextDay.getTime() + 86400000);
            }
            targetDate = nextDay;
        }
        const dayOfWeek = targetDate.getDay();
        if (!workingDays.includes(dayOfWeek)) {
            const dayName = targetDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
            return {
                valid: false,
                reason: `${dayName} falls on a Sunday (non-working day). Our interview schedule is Monday to Saturday, 10:00 AM – 6:00 PM IST.`,
                availableSlots,
            };
        }
        if (targetDate.getTime() < now.getTime() - 5 * 60000) {
            return {
                valid: false,
                reason: `The requested time (${targetDate.toLocaleString("en-IN")}) is in the past. Please choose a future interview slot.`,
                availableSlots,
            };
        }
        const formattedSlot = targetDate.toLocaleString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        }) + " IST";
        return {
            valid: true,
            formattedSlot,
            dateObj: targetDate,
            availableSlots,
        };
    }
};
exports.JobOpeningsService = JobOpeningsService;
exports.JobOpeningsService = JobOpeningsService = JobOpeningsService_1 = __decorate([
    (0, common_1.Injectable)()
], JobOpeningsService);
//# sourceMappingURL=JobOpenings.service.js.map