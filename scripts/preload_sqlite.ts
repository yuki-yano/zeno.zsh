import { Database } from "../src/deps.ts";

const db = new Database(":memory:");
db.close();
