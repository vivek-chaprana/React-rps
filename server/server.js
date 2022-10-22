const express = require("express");
const http = require("http");
const {Server} = require("socket.io");
const cors = require("cors")

const app = express();
const port = 5000;

app.use(cors())

const server = http.createServer(app);



const io = new Server(server, {
    cors : {
        origin : "http://localhost:3000", 
    }
})


const {userConnected, connectedUsers, initializeChoices, moves, makeMove, choices} = require("./utils/users");
const {createRoom, joinRoom, exitRoom, rooms} = require("./utils/rooms");


io.on("connection", socket => {
    console.log(`User connected with id : ${socket.id}`)
    socket.on("create-room", (roomId) => {
        if(rooms[roomId]){
            const error = "This room already exists";
            socket.emit("display-error", error);
            console.log("room creation failed bruh")
        }else{
            userConnected(socket.client.id);
            createRoom(roomId, socket.client.id);
            socket.emit("room-created", roomId);
            socket.emit("player-1-connected");
            socket.join(roomId);
            console.log("room created bruh")
        }
    })

    socket.on("join-room", roomId => {
        if(!rooms[roomId]){
            const error = "This room doen't exist";
            socket.emit("display-error", error);
            console.log("Room joined failed");
            
        }else{
            userConnected(socket.client.id);
            joinRoom(roomId, socket.client.id);
            socket.join(roomId);

            socket.emit("room-joined", roomId);
            socket.emit("player-2-connected");
            socket.broadcast.to(roomId).emit("player-2-connected");
            initializeChoices(roomId);
            console.log("Room joined bruh");
            
        }
    })

    socket.on("join-random", () => {
        let roomId = "";

        for(let id in rooms){
            if(rooms[id][1] === ""){
                roomId = id;
                break;
            }
        }

        if(roomId === ""){
            const error = "All rooms are full or none exists";
            socket.emit("display-error", error);
            console.log("All rooms full");
            
        }else{
            userConnected(socket.client.id);
            joinRoom(roomId, socket.client.id);
            socket.join(roomId);

            socket.emit("room-joined", roomId);
            socket.emit("player-2-connected");
            socket.broadcast.to(roomId).emit("player-2-connected");
            initializeChoices(roomId);
            console.log("Random room joined");
            
        }
    });

    socket.on("make-move", (obj) => {
        let roomId = obj.roomId;
        let playerId = obj.playerId;
        let myChoice = obj.ch === 1 ? "rock" : obj.ch === 2 ? "paper" : "scissor"
        makeMove(roomId, playerId, myChoice);

        if(choices[roomId][0] !== "" && choices[roomId][1] !== ""){
            let playerOneChoice = choices[roomId][0];
            let playerTwoChoice = choices[roomId][1];

            if(playerOneChoice === playerTwoChoice){
                let message = "Both of you chose " + playerOneChoice + " . So it's draw";
                io.to(roomId).emit("draw", message);
                
            }else if(moves[playerOneChoice] === playerTwoChoice){
                console.log("p1 jeet raha hai");

                console.log(playerId);
                
                const choiceObj = {playerOneChoice,playerTwoChoice};

                // if(playerId === 1){
                //     enemyChoice = playerTwoChoice;
                // }else{
                //     enemyChoice = playerOneChoice;
                // }
                // console.log("My , Enemy :" + myChoice + enemyChoice);
                console.log(choiceObj);
                

                io.to(roomId).emit("player-1-wins", choiceObj);
            }else{
                console.log("p2 jeet raha hai");
                console.log(playerId);
                const choiceObj = {playerOneChoice,playerTwoChoice};
                console.log(choiceObj);


                
                
                // let enemyChoice = "";

                // if(playerId === 1){
                //     enemyChoice = playerTwoChoice;
                // }else{
                //     enemyChoice = playerOneChoice;
                // }

                // console.log("My , Enemy :" + myChoice + enemyChoice);

                io.to(roomId).emit("player-2-wins", choiceObj);
            }

            choices[roomId] = ["", ""];
        }
    });

    socket.on("disconnect", () => {
        console.log("disconnect called...");
        
        if(connectedUsers[socket.client.id]){
            let player;
            let roomId;

            for(let id in rooms){
                if(rooms[id][0] === socket.client.id || 
                    rooms[id][1] === socket.client.id){
                    if(rooms[id][0] === socket.client.id){
                        player = 1;
                    }else{
                        player = 2;
                    }

                    roomId = id;
                    break;
                }
            }

            exitRoom(roomId, player);

            if(player === 1){
                io.to(roomId).emit("player-1-disconnected");
                console.log("p 1 dis");
                
            }else{
                io.to(roomId).emit("player-2-disconnected");
                console.log("p 2 dis");
                
            }
        }
    })
})

server.listen(port, () => console.log(`Server started on port ${port}
http://localhost:${port}`));