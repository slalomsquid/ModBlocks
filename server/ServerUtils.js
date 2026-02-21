// export function stopServer() {
//   console.log('--- Logic to stop the server goes here ---');
//   writeJson("world/world.json", loaded_world);
//   exit();
// };

// export function saveServer() {
//   console.log("Saving")
//   try {
//     writeJson("server_setting.json", settings);
//     writeJson("world/world.json", loaded_world);
//     writeJson("world/world_gen.json", terrain_perams);
//   } catch (err) {
//     return 0;
//   }
//   return 1;
// };

export function webLog(message) {
    try {
        ws.send(JSON.stringify({ type: 0, data: message }));
    } catch (err) {
        console.log("Couldnt connect to Web Interface");
        console.log(err);
    }
}