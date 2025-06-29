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
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);
        io.to(room).emit("room.join", `User ${socket.id} has joined the room`);

        // Initialize cards for the room if not already done
        if (!cardsMap.has(room)) {
            cardsMap.set(room, []);
            console.log(`Initialized cards for room: ${room}`);
        }

        // Emit existing cards to the newly joined user
        const existingCards = cardsMap.get(room);
        socket.emit("cards.initial", existingCards);
        console.log(`Sent existing cards to user ${socket.id} in room ${room}`);
    });

    socket.on("leaveRoom", (room) => {
        console.log(`User ${socket.id} requested to leave room: ${room}`);

        io.to(room).emit("room.leave", `User ${socket.id} has left the room`);
        socket.leave(room);
        console.log(`User ${socket.id} left room: ${room}`);

        // Check if the room is empty after the user leaves
        const roomSockets = io.sockets.adapter.rooms.get(room);
        if (!roomSockets || roomSockets.size === 0) {
            // Delete the cards for the room
            cardsMap.delete(room);
            console.log(`Deleted cards for room ${room} as it is now empty`);
        }
    });

    socket.on("card.add", (room, card) => {
        io.to(room).emit("card.added", card);
        console.log(`Card added in room ${room}:`, card);

        // Update the cards map for the room
        const cards = cardsMap.get(room) || [];
        cards.push(card);
    });

    socket.on("card.update", (room, cardId, card) => {
        io.to(room).emit("card.updated", cardId, card);
        console.log(`Card updated in room ${room}:`, cardId);

        // Update the cards map for the room
        const cards = cardsMap.get(room) || [];
        const cardIndex = cards.findIndex(c => c.id === cardId);
        if (cardIndex !== -1) {
            cards[cardIndex] = card; // Update the card in the array
            cardsMap.set(room, cards); // Update the map
        }
        console.log(`Updated cards for room ${room}:`, cards);
    });

    socket.on("card.remove", (room, cardId) => {
        io.to(room).emit("card.removed", cardId);
        console.log(`Card removed in room ${room}:`, cardId);

        // Update the cards map for the room
        const cards = cardsMap.get(room) || [];
        const updatedCards = cards.filter(c => c.id !== cardId);
        cardsMap.set(room, updatedCards); // Update the map with filtered cards
        console.log(`Updated cards for room ${room}:`, updatedCards);
    });

    socket.on("user.update", (room, user) => {
        io.to(room).emit("user.updated", user);

        const cards = cardsMap.get(room) || [];
        const userCards = cards.filter(c => c.user.name === user.name);
        console.log(userCards)
        if (userCards) {
            userCards.forEach(userCards => {
                userCards.user = user; // Update user information in the card
            });
        } else {
            console.warn(`User ${user.name} not found in room ${room}`);
        }

        console.log(`User updated in room ${room}:`, user);
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
