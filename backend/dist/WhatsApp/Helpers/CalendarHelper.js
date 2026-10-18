"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarHelper = void 0;
const axios_1 = __importDefault(require("axios"));
class CalendarHelper {
    static async createGoogleMeetRoom(title, slotString = "tomorrow at 10:00 AM", durationMinutes = 30) {
        var _a, _b, _c, _d, _e, _f, _g;
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
        if (clientId && clientSecret && refreshToken) {
            try {
                const tokenRes = await axios_1.default.post("https://oauth2.googleapis.com/token", {
                    client_id: clientId,
                    client_secret: clientSecret,
                    refresh_token: refreshToken,
                    grant_type: "refresh_token",
                });
                const accessToken = (_a = tokenRes.data) === null || _a === void 0 ? void 0 : _a.access_token;
                if (accessToken) {
                    const startTime = new Date();
                    startTime.setDate(startTime.getDate() + 1);
                    startTime.setHours(10, 0, 0, 0);
                    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
                    const res = await axios_1.default.post("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1", {
                        summary: title,
                        start: { dateTime: startTime.toISOString(), timeZone: "Asia/Kolkata" },
                        end: { dateTime: endTime.toISOString(), timeZone: "Asia/Kolkata" },
                        conferenceData: {
                            createRequest: {
                                requestId: `meet-${Date.now()}`,
                                conferenceSolutionKey: { type: "hangoutsMeet" },
                            },
                        },
                    }, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                        },
                    });
                    const meetUrl = ((_b = res.data) === null || _b === void 0 ? void 0 : _b.hangoutLink) || ((_f = (_e = (_d = (_c = res.data) === null || _c === void 0 ? void 0 : _c.conferenceData) === null || _d === void 0 ? void 0 : _d.entryPoints) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.uri);
                    if (meetUrl) {
                        return {
                            meetUrl,
                            calUrl: ((_g = res.data) === null || _g === void 0 ? void 0 : _g.htmlLink) || "",
                        };
                    }
                }
            }
            catch (err) {
                console.warn("Google Calendar API error, falling back to direct meet code:", err === null || err === void 0 ? void 0 : err.message);
            }
        }
        const randCode1 = Math.random().toString(36).substring(2, 5);
        const randCode2 = Math.random().toString(36).substring(2, 6);
        const randCode3 = Math.random().toString(36).substring(2, 5);
        const fallbackMeetUrl = `https://meet.google.com/${randCode1}-${randCode2}-${randCode3}`;
        return {
            meetUrl: fallbackMeetUrl,
            calUrl: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}`,
        };
    }
}
exports.CalendarHelper = CalendarHelper;
//# sourceMappingURL=CalendarHelper.js.map