import { apiKey } from "./credentials";
const timeOffset = "+02:00"

export const colors = {
    "Pavone": "7",
    "Pomodoro": "11",
    "Fenicottero": "4",
    "Mandarino": "6",
    "Banana": "5",
    "Salvia": "2",
    "Basilico": "10",
    "Mirtillo": "9",
    "Lavanda": "1",
    "Vinaccia": "3",
    "Grafite": "8",
}

export function minsToTime(mins) {
    // Converts # minutes after 08:00 to time
    let hours = Math.floor(mins / 60);
    hours = hours + 8;
    let minutes = mins % 60;

    let str = "";

    if (hours < 10)
        str = str + "0";
    str = str + hours;

    str = str + ":";

    if (minutes == 0)
        str = str + "0";
    str = str + minutes;

    str = str + ":00";

    str = str + timeOffset;

    return str;

}

export async function getCalendarList(token) {
    let fetch_options = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Accept': 'application/json',
        }
    };

    let res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?key=' + apiKey,
        fetch_options)
    let data = await res.json()

    return data.items;

}

export async function sendToGoogleCalendar(events, lessons, subjectColorsId, token, calId) {
    let index = 0;
    let promises = [];

    for (let event of events) {
        event["colorId"] = subjectColorsId[lessons[index].subject] ?? "7";
        let fetch_options = {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
        };

        promises.push(fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
            fetch_options));
        index++;
    }

    return Promise.all(promises);

}