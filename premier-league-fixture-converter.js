const fs = require("fs");
const path = require("path");

// Sample JSON input (replace with your actual JSON file path)
const inputFilePath = "premier_league_games_2024.json";
const outputDir = path.join(__dirname, "output_notes"); // Base directory to save the Markdown files

const nameMapping = {
    "Brighton Hove": "Brighton Hove Albion",
    "Man City": "Manchester City",
    "Man United": "Manchester United",
    "Newcastle": "Newcastle United",
    "Nottingham": "Nottingham Forest",
    "Tottenham": "Tottenham Hotspur",
    "West Ham": "West Ham United",
    "Wolverhampton": "Wolverhampton Wanderers"
};

// Helper function to extract year and formatted date from an ISO-8601 timestamp
const extractYearAndDate = (utcDate) => {
    const date = new Date(utcDate);

    // Extract year
    const year = date.getUTCFullYear();

    // Format date as YYYY-MM-DD
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    return { year, formattedDate };
};

// Helper function to remap team names
const remapName = (name) => {
    return nameMapping[name] || name; // Return mapped name or original if no mapping exists
};

// Ensure a directory exists
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

let refereeList = [];
let matchweekList = new Map();

// Read the JSON data
fs.readFile(inputFilePath, "utf8", (err, data) => {
    if (err) {
        console.error("Error reading input file:", err);
        return;
    }

    let matches;
    try {
        matches = JSON.parse(data).matches;
    } catch (parseErr) {
        console.error("Error parsing JSON:", parseErr);
        return;
    }

    matches.forEach(match => {
        const {
            homeTeam: { shortName: homeShortName },
            awayTeam: { shortName: awayShortName },
            utcDate,
            matchday,
            score: {
                halfTime: { home: halfTimeHome, away: halfTimeAway },
                fullTime: { home: fullTimeHome, away: fullTimeAway },
            },
            referees,
        } = match;

        // Extract year and formatted date
        const { year, formattedDate: date } = extractYearAndDate(utcDate);

        // Ensure output directory for the year exists
        const yearDir = path.join(outputDir, String(year));
        ensureDirectoryExists(yearDir);

        // Remap team names
        const homeTeamName = remapName(homeShortName);
        const awayTeamName = remapName(awayShortName);

        const refereeName = referees.length > 0 ? referees[0].name : "Unknown";

        // Add referee if this is a new ref
        if (!refereeList.includes(refereeName) && refereeName != "Unknown") {
            refereeList.push(refereeName);
        }
        // Update matchweek
        if (!matchweekList.has(matchday)) {
            matchweekList.set(matchday, [date, date]);
        } else {
            let [mwStart, mwEnd] = matchweekList.get(matchday);
            if (date < mwStart) {
               mwStart = date; 
            }
            if (date > mwEnd) {
                mwEnd = date;
            }
            matchweekList.set(matchday, [mwStart, mwEnd]);
        }

        const noteTitle = `${date} - ${homeTeamName} vs ${awayTeamName} - Premier League.md`;
        const refereeLink = refereeName !== "Unknown" ? `[[${refereeName}]]` : refereeName;
        const noteContent = `---
type: football match
name: ${noteTitle}
group-key: event
competition: Premier League
season: 2024-2025
kickoff: ${utcDate}
home-team: ${homeTeamName}
away-team: ${awayTeamName}
matchweek: ${matchday}
half-time: ${halfTimeHome} - ${halfTimeAway}
full-time: ${fullTimeHome} - ${fullTimeAway}
referee: ${refereeName}
---
[[${homeTeamName}]] vs. [[${awayTeamName}]] played in [[Matchweek ${matchday} - Premier League 2024-2025|Matchweek ${matchday}]], refereed by ${refereeLink}.`;

        // Write the note to a file in the appropriate year folder
        const outputFilePath = path.join(yearDir, noteTitle);
        fs.writeFile(outputFilePath, noteContent, "utf8", (writeErr) => {
            if (writeErr) {
                console.error(`Error writing note for match ${noteTitle}:`, writeErr);
            }
        });
    });

    // Generate referee notes
    const refDir = path.join(outputDir, "People");
    ensureDirectoryExists(refDir);
    refereeList.map(r => {
        const outputFilePath = path.join(refDir, `${r}.md`);
        const refNoteContent = `---
type: person
name: ${r}
profession: football referee
---`
        fs.writeFile(outputFilePath, refNoteContent, "utf8", (writeErr) => {
            if (writeErr) {
                console.log(`Error writing note for referee ${r}:`, writeErr);
            }
        });
    });

    // Generate matchweek notes
    const mwDir = path.join(outputDir, "Fixtures");
    ensureDirectoryExists(mwDir);
    for (const [mw, dates] of matchweekList.entries()) {
        const outputFilePath = path.join(mwDir, `Matchweek ${mw} - Premier League 2024-2025.md`);
        const mwNoteContent = `---
type: football season
name: Matchweek ${mw} - Premier League 2024-2025
group-key: event
league: Premier League
season: 2024-2025
matchweek: ${mw}
starts: ${dates[0]}
ends: ${dates[1]}
---
#### Matches
\`\`\`dataview
TABLE WITHOUT ID
	"[[" + file.name + "|" + home-team + " vs. " + away-team + "]]" AS "Note",
	dateformat(kickoff, "hh:mm - EEE MMM dd") AS "Kickoff",
	referee AS "Referee"
FROM "Sports/Fixtures"
WHERE 
	type = "football match"
	AND
	matchweek = this.matchweek
SORT kickoff ASC
\`\`\`
`;
        fs.writeFile(outputFilePath, mwNoteContent, "utf8", (writeErr) => {
            if (writeErr) {
                console.log(`Error writing note for matchweek ${mw}:`, writeErr);
            }
        });
    }

    console.log(`Wrote ${matches.length} matches, ${refereeList.length} referees, and ${matchweekList.size} match weeks.`);
    console.log("Processing complete!");
});
