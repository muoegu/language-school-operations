import dotenv from "dotenv";
import path from "node:path";

// Local commands are usually run from api/, while Neon CLI writes .env.local
// at the repository root. Load both locations without overriding shell values.
for (const filePath of [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "..", ".env.local"),
  path.resolve(process.cwd(), "..", ".env"),
]) {
  dotenv.config({ path: filePath });
}
