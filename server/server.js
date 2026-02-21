// npm run dev
// This is the .js backend/server for ModBlocks, written by Angus on 2-2026

const start = Date.now();

import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import { writeFile, mkdir, readFile } from "fs/promises";
import { exit } from "process";
import http from "node:http";
import {readJson, writeJson, hashPair, unhashPair, setBaseDir} from "./SlalomJsUtils/SlalomUtils.js";
import { webLog } from "./ServerUtils.js";
import server_commands from "./server_commands.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure Slalom utils read/write relative to the server.js location
setBaseDir(__dirname);

// Read settings with defualt incase of missing or broken file
var settings = await readJson("server_setting.json", { "WS_PORT": 8000, "WebInterface": { "Enabled": true, "Port": 8080, "UI": "ui/index.html", "Username": "Admin", "Password": "Admin" }});
// Write settings back incase of missing file or keys
writeJson("server_setting.json", settings);

var loaded_world = await readJson("world/world.json", { LUT:{"air":"0", "stone":"1", "bricks":"2", "grass":"3", "dirt":"4"}, chunks: {}, origin_chunk: hashPair(0,0).toString(), players: {} });
writeJson("world/world.json", loaded_world);

var terrain_perams = await readJson("world/world_gen.json", { "world_height": 10, "sea_level": -5, "max_floor_height": 8, "min_floor_height": 2, "surface_block": "grass", "ground_block": "stone" });
writeJson("world/world_gen.json", terrain_perams);

// Initialise web ui if enabled in settings
if (settings.WebInterface.Enabled) {
    const httpServer = http.createServer(async (req, res) => {
    try {
        const htmlPath = path.join(__dirname, settings.WebInterface.UI);
        const content = await readFile(htmlPath, "utf8");
        
        // Correct type is text/html
        res.writeHead(200, { "Content-Type": "text/html" }); 
        res.end(content);
    } catch (err) {
        if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end("Error: index.html file not found in directory.");
        } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.message}`);
        }
    }
    });

    httpServer.listen(settings.WebInterface.Port, () => {
    console.log(`Web interface hosted at http://localhost:${settings.WebInterface.Port}`);
    });
}

const wss = new WebSocketServer({ port: 8000 });

wss.on("connection", ws => {
  console.log("Godot connected");

  ws.on("message", msg => {
    console.log(String(Date.now() - start) + ": Received:", msg.toString());
    // console.log("Received:", msg.toString());

    var data = { type: 0 }

    try {
      data = JSON.parse(msg.toString());
    } catch (err) {
      console.log("invalid packet");
    }

    switch (data["type"]) {
      case 0:
        if (data["password"] == settings.WebInterface.Password) {
            console.log("Admin command: " + String(data.command))
            try {
                server_commands[data.command].run(ws, server_commands);
            } catch (err) {
                console.log("Admin command error:", err);
                ws.send(JSON.stringify({ type: 0, data: "Command not recognised... Try running 'help'" }));
            }
        }
        break;
      case 1:
        let rawPos = data.data.player_pos; 
        console.log(rawPos)
        // define empty object
        var player_chunk = {};
        // Remove parenthesis and split by comma
        // This converts "(3, 3)" -> ["3", " 3"] -> [3, 3]
        let coords = rawPos.replace(/[()]/g, '').split(',').map(Number);
        player_chunk.x = Math.floor(coords[0] / 10)
        player_chunk.y = Math.trunc(coords[1] / 10)
        console.log(player_chunk);

        console.log(data)
        console.log("space")
        console.log(data.data.block_updates)

        // try {
        //   data = JSON.parse(msg.toString());
        // } catch (err) {
        //   console.log("invalid packet");
        // }

        // if ("block_updates" in data.data) {
        //   for (let i = 0; i < data.data.block_updates.length; i++) {
        //     let update = data.data.block_updates[block_update]
        //     console.log(update)
        //     // setBlock()
        //   }
        // }

        if (data.data && data.data.block_updates) {
          for (let i = 0; i < data.data.block_updates.length; i++) {
            let update = data.data.block_updates[i]; // Use the iterator 'i'
            console.log("Applying update:", update);
            
            // console.log(update.coord[0])

            let b_coords = typeof update.coord === 'string'
              ? update.coord.replace(/[()]/g, '').split(',').map(Number)
              : update.coord;

            // Ensure we have valid numbers before calling setBlock
            if (!isNaN(b_coords[0]) && !isNaN(b_coords[1])) {
              let chunk_xy = getChunkXYFromCoord(b_coords[0], b_coords[1]);
              let chunk = getChunk(chunk_xy[0], chunk_xy[1]);
              let chunk_block = getChunkBlockFromCoord(b_coords[0], b_coords[1]);
              let new_block = update["new"]
              console.log(new_block)
              setChunkBlock(chunk, chunk_block[0], chunk_block[1], new_block)
              // loaded_world.chunks[] setBlock(b_coords[0], b_coords[1], update.new);
            }

            // Now you can safely call setBlock
            // setBlock(update.coord[0], update.coord[1], update.new);
          }
        }

        let chunk = getChunk(player_chunk.x, player_chunk.y);
        ws.send(JSON.stringify({ "type": 1, "chunk_pos": [player_chunk.x, player_chunk.y], "chunk": chunk, "lut": loaded_world.LUT }));
        // ws.send(JSON.stringify({ "type": 1, "chunk_pos": [player_chunk.x, player_chunk.y], "chunk": loaded_world.chunks[hashPair(player_chunk.x, player_chunk.y)], "lut": loaded_world.LUT }));
        break;
      case 2:
        console.log("loging request")
        console.log(players)
        if (data["ID"] in players ) {
          if (data["Password"] == players[data["ID"]]["Password"]) {
            ws.send(JSON.stringify({ "type": 2, "connection": true }));
            console.log("Logged in player " + String(data["ID"]));
          } else {
            ws.send(JSON.stringify({ "type": 2, "connection": false }));
            console.log("Login failed " + String(data["ID"]));
          }
        } else {
          ws.send(JSON.stringify({ "type": 2, "connection": true }));
          // For whatever reason we have to make a blank object before we 
          players[data["ID"]] = { "Password" : data["Password"]};
          // players[data["ID"]]["Password"] = data["Password"];
          console.log(players);
          console.log("Registered player " + String(data["ID"]));
        }
        break;
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});
