export interface MeetRoomResult {
    meetUrl: string;
    calUrl: string;
}
export declare class CalendarHelper {
    static createGoogleMeetRoom(title: string, slotString?: string, durationMinutes?: number): Promise<MeetRoomResult>;
}
