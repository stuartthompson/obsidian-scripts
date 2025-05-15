import { generateDailySummaries } from "./generate-daily-summaries";
import { convertPolarbeat } from "./polarbeat-converter";

const recipes: { [key: string]: Function } = {
    "generate-daily-summaries": generateDailySummaries,
    "convert-polarbeat": convertPolarbeat,
};

const recipeName = process.argv[2];
const year = parseInt(process.argv[3]);
// Change default outputDir for daily summaries
const outputDir =
    process.argv[4] ||
    (recipeName === "generate-daily-summaries"
        ? "./output/Daily"
        : "./output");

if (!recipes[recipeName]) {
    console.error(`❌ Recipe "${recipeName}" not found.`);
    process.exit(1);
}

try {
    recipes[recipeName](year, outputDir);
} catch (error) {
    if (error instanceof Error) {
        console.error(`❌ Error running recipe "${recipeName}":`, error.message);
    } else {
        console.error(`❌ Error running recipe "${recipeName}":`, error);
    }
    process.exit(1);
}
console.log(`✅ Recipe "${recipeName}" completed successfully.`);
process.exit(0);
