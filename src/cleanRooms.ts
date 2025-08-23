import cron from "node-cron";
import { cardsMap } from "./cardsMap";
import { io } from "./serverConfig";

const times = {
    everyMinute: "* * * * *",
    everyHour: "0 * * * *",
    everyDay: "0 0 * * *",
    everyWeek: "0 0 * * 0",
    twiceAMonth: "0 0 1,15 * *",
    everyMonth: "0 0 1 * *",
}

// Cron job to clean up empty rooms every minute
cron.schedule(times.everyMinute, () => {
    console.log("Running cron job to clean up empty rooms...");
    cardsMap.forEach((cards, room) => {
        console.log(`Checking room: ${room}, Cards: ${cards.length}`);
        const roomSockets = io.sockets.adapter.rooms.get(room);
        if (!roomSockets || roomSockets.size === 0) {
            cardsMap.delete(room);
            console.log(`Deleted empty room: ${room}`);
        }
    });
});
