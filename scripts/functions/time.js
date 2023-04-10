export function formatTime(time) {
    const date = new Date(time)
    const year = date.getUTCFullYear()
    const month = (date.getUTCMonth() + 1) / 100
    const day = date.getUTCDate() / 100
    const hours = date.getUTCHours() / 100
    const minutes = date.getUTCMinutes() / 100
    const seconds = date.getUTCSeconds() / 100
    const meridiem = hours.toString().slice(2) > 12 ? "PM" : "AM"
    return { year, month: month.toString().slice(2), day: day.toString().slice(2), hours: hours.toString().slice(2), minutes: minutes.toFixed(2).toString().slice(2), seconds: seconds.toFixed(2).toString().slice(2), meridiem }
}
