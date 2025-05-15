import { generateDailySummaries } from "./generate-daily-summaries";
import { convertPolarbeat } from "./polarbeat-converter";
import { convertPremierLeagueFixtures } from "./premier-league-fixture-converter";
import { generateMonthlySummaries } from "./generate-monthly-summaries";

const recipes: { [key: string]: Function } = {
    "generate-daily-summaries": generateDailySummaries,
    "convert-polarbeat": convertPolarbeat,
    "convert-premier-league": convertPremierLeagueFixtures,
    "generate-monthly-summaries": generateMonthlySummaries,
};

const recipeName = process.argv[2];
const year = parseInt(process.argv[3]);
const outputDir = getOutputDir(recipeName);

/**
 * Determines the output directory based on the recipe name.
 * @param recipeName The name of the recipe.
 * @returns The output directory path.
 */
function getOutputDir(recipeName: string): string {
    switch (recipeName) {
    case "generate-daily-summaries":
        return "./output/daily";
    case "generate-weekly-summaries":
        return "./output/weekly";
    case "generate-monthly-summaries":
        return "./output/monthly";
    case "convert-polarbeat":
        return "./output/polarbeat";
    case "convert-premier-league":
        return "./output/premier-league";
    default:
        return "./output";
    }
}

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
