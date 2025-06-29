import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const cardsMap = new Map();

io.on("connection", (socket) => {
    console.log(`A user connected: ${socket.id}`);

    socket.on("joinRoom", (room) => {
        try {
            if (!room || typeof room !== "string") {
                throw new Error("Invalid room name");
            }

            socket.join(room);
            console.log(`User ${socket.id} joined room: ${room}`);
            io.to(room).emit("room.join", `User ${socket.id} has joined the room`);

            if (!cardsMap.has(room)) {
                cardsMap.set(room, []);
                console.log(`Initialized cards for room: ${room}`);
            }

            const existingCards = cardsMap.get(room);
            socket.emit("cards.initial", existingCards);
            console.log(`Sent existing cards to user ${socket.id} in room ${room}`);
        } catch (error) {
            console.error(`Error in joinRoom: ${error.message}`);
            socket.emit("error", "Failed to join room");
        }
    });

    socket.on("leaveRoom", (room) => {
        try {
            if (!room || typeof room !== "string") {
                throw new Error("Invalid room name");
            }

            console.log(`User ${socket.id} requested to leave room: ${room}`);
            io.to(room).emit("room.leave", `User ${socket.id} has left the room`);
            socket.leave(room);
            console.log(`User ${socket.id} left room: ${room}`);

            const roomSockets = io.sockets.adapter.rooms.get(room);
            if (!roomSockets || roomSockets.size === 0) {
                cardsMap.delete(room);
                console.log(`Deleted cards for room ${room} as it is now empty`);
            }
        } catch (error) {
            console.error(`Error in leaveRoom: ${error.message}`);
            socket.emit("error", "Failed to leave room");
        }
    });

    socket.on("card.add", (room, card) => {
        try {
            if (!room || typeof room !== "string" || !card || typeof card !== "object") {
                throw new Error("Invalid room or card data");
            }

            io.to(room).emit("card.added", card);
            console.log(`Card added in room ${room}:`, card);

            const cards = cardsMap.get(room) || [];
            cards.push(card);
            cardsMap.set(room, cards);
        } catch (error) {
            console.error(`Error in card.add: ${error.message}`);
            socket.emit("error", "Failed to add card");
        }
    });

    socket.on("card.update", (room, cardId, card) => {
        try {
            if (!room || typeof room !== "string" || !cardId || !card) {
                throw new Error("Invalid room, cardId, or card data");
            }

            io.to(room).emit("card.updated", cardId, card);
            console.log(`Card updated in room ${room}:`, cardId);

            const cards = cardsMap.get(room) || [];
            const cardIndex = cards.findIndex((c) => c.id === cardId);
            if (cardIndex !== -1) {
                cards[cardIndex] = card;
                cardsMap.set(room, cards);
            } else {
                console.warn(`Card with ID ${cardId} not found in room ${room}`);
            }
        } catch (error) {
            console.error(`Error in card.update: ${error.message}`);
            socket.emit("error", "Failed to update card");
        }
    });

    socket.on("card.remove", (room, cardId) => {
        try {
            if (!room || typeof room !== "string" || !cardId) {
                throw new Error("Invalid room or cardId");
            }

            io.to(room).emit("card.removed", cardId);
            console.log(`Card removed in room ${room}:`, cardId);

            const cards = cardsMap.get(room) || [];
            const updatedCards = cards.filter((c) => c.id !== cardId);
            cardsMap.set(room, updatedCards);
            console.log(`Updated cards for room ${room}:`, updatedCards);
        } catch (error) {
            console.error(`Error in card.remove: ${error.message}`);
            socket.emit("error", "Failed to remove card");
        }
    });

    socket.on("user.update", (room, user) => {
        try {
            if (!room || typeof room !== "string" || !user || typeof user !== "object") {
                throw new Error("Invalid room or user data");
            }

            io.to(room).emit("user.updated", user);

            const cards = cardsMap.get(room) || [];
            const userCards = cards.filter((c) => c.user.name === user.name);
            if (userCards.length > 0) {
                userCards.forEach((userCard) => {
                    userCard.user = user;
                });
            } else {
                console.warn(`User ${user.name} not found in room ${room}`);
            }

            console.log(`User updated in room ${room}:`, user);
        } catch (error) {
            console.error(`Error in user.update: ${error.message}`);
            socket.emit("error", "Failed to update user");
        }
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`Socket server is running on http://localhost:${PORT}`);
});

const app = express();

app.get("/", (req, res) => {
    res.send("Socket server is running!");
});

// Express error-handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something went wrong!");
});
