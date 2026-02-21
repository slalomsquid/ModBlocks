// npm run dev
// This is the .js backend/server for ModBlocks, written by Angus on 2-2026

const start = Date.now();

import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import { writeFile, mkdir, readFile } from "fs/promises";
import { exit } from "process";
import http from "node:http";
import {readJson} from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

