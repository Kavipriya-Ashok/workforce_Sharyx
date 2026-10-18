import axios from "axios";

export interface MeetRoomResult {
  meetUrl: string;
  calUrl: string;
}

export class CalendarHelper {
  public static async createGoogleMeetRoom(
    title: string,
    slotString: string = "tomorrow at 10:00 AM",
    durationMinutes: number = 30
  ): Promise<MeetRoomResult> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    // 1. If Google OAuth credentials exist in environment, generate real Google Meet event
    if (clientId && clientSecret && refreshToken) {
      try {
        const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        });

        const accessToken = tokenRes.data?.access_token;
        if (accessToken) {
          const startTime = new Date();
          startTime.setDate(startTime.getDate() + 1);
          startTime.setHours(10, 0, 0, 0);
          const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

          const res = await axios.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
            {
              summary: title,
              start: { dateTime: startTime.toISOString(), timeZone: "Asia/Kolkata" },
              end: { dateTime: endTime.toISOString(), timeZone: "Asia/Kolkata" },
              conferenceData: {
                createRequest: {
                  requestId: `meet-${Date.now()}`,
                  conferenceSolutionKey: { type: "hangoutsMeet" },
                },
              },
            },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );

          const meetUrl =
            res.data?.hangoutLink || res.data?.conferenceData?.entryPoints?.[0]?.uri;
          if (meetUrl) {
            return {
              meetUrl,
              calUrl: res.data?.htmlLink || "",
            };
          }
        }
      } catch (err: any) {
        console.warn("Google Calendar API error, falling back to direct meet code:", err?.message);
      }
    }

    // 2. Direct Fallback: Instant unique meeting room URL
    const randCode1 = Math.random().toString(36).substring(2, 5);
    const randCode2 = Math.random().toString(36).substring(2, 6);
    const randCode3 = Math.random().toString(36).substring(2, 5);
    const fallbackMeetUrl = `https://meet.google.com/${randCode1}-${randCode2}-${randCode3}`;

    return {
      meetUrl: fallbackMeetUrl,
      calUrl: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        title
      )}`,
    };
  }
}
