exports.getDate = () => {
    const today = new Date();
    const date = today.toLocaleDateString("en-US",{
        timeZone: "Asia/Kolkata",
        year:"numeric",
        month:"long",
        day:"numeric"
    });
    return date.toString();
};
exports.getTime = () => {
    const today = new Date();
    const time = today.toLocaleTimeString('en-US', {
        timeZone: "Asia/Kolkata",
        hour:"numeric",
        minute:"numeric"
    });
    return time.toString();
};