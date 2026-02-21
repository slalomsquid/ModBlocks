const server_commands = {
  help: {
    description: "Provides a list of available commands and their descriptions.",
    run: (ws, server_commands) => {
      const seen = new Set();
      for (const name in server_commands) {
        const cmd = server_commands[name];
        if (seen.has(cmd)) continue;   // skip alias
        seen.add(cmd);
        ws.send(JSON.stringify({ type: 0, data: `${name} - ${cmd.description}` }));
      }
    }
  },
  test: {
    description: "Returns a message if the server is online",
    print: "Requesting server response...",
    run: (ws) => {
      ws.send(JSON.stringify({ type: 0, data: "Server is online" }));
    }
  },
  save: {
    description: "Saves the server data to files",
    print: "Saving server data...",
    run: (ws) => {
      console.log("Saving")
      try {
        writeJson("server_setting.json", settings);
        writeJson("world/world.json", loaded_world);
        writeJson("world/world_gen.json", terrain_perams);
      } catch (err) {
        console.log(err)
      }
    }
  },
  stop: {
    description: "Saves then stops the server",
    print: "Saving server data...",
    run: (ws) => {
      console.log("Saving")
      try {
        writeJson("server_setting.json", settings);
        writeJson("world/world.json", loaded_world);
        writeJson("world/world_gen.json", terrain_perams);
        exit();
      } catch (err) {
        console.log(err)
      }
    }
  }
};

//alias
server_commands.s = server_commands.save;
server_commands.exit = server_commands.save;
server_commands.quit = server_commands.save;

export default server_commands;