import { processPolarFiles } from "./polarbeat-converter";
import path from "path";

// Define commands
const commands: Record<string, () => void> = {
  polar: () => {
    const importPath = path.resolve("./input");
    const outputPath = path.resolve("./output");
    processPolarFiles(importPath, outputPath);
  },
};

// Get the command from the arguments
const command = process.argv[2];

if (command && commands[command]) {
  commands[command]();
} else {
  console.error(`Unknown command: ${command}`);
  console.log("Available commands: polar");
  process.exit(1);
}