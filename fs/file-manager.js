const fs = require("node:fs/promises");
const path = require("node:path");

const USERS_FILE = path.join(__dirname, "..", "module", "user.json");

async function read_file() {
  try {
    const data = await fs.readFile(USERS_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (error) {
    if (error.code === "ENOENT") {
      await write_file([]);
      return [];
    }
    throw error;
  }
}

async function write_file(data) {
  await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2), "utf8");
}

module.exports = { read_file, write_file };
