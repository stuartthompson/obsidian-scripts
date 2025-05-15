import * as fs from "fs";
import * as path from "path";

export function generateDailySummaries(year: number, outputDirArg?: string) {
    // Log: Start of script
    console.log("[log] Starting daily summary generation script.");

    if (isNaN(year)) {
        console.error("Usage: generateDailySummaries(<year>, [outputDir])");
        process.exit(1);
    }
    console.log(`[log] Generating daily notes for year: ${year}`);

    // Prepare output directory (default: ./output/Daily)
    const outputDir: string = outputDirArg
        ? path.resolve(outputDirArg)
        : path.join(__dirname, "output", "Daily");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`[log] Created output directory: ${outputDir}`);
    } else {
        console.log(`[log] Output directory exists: ${outputDir}`);
    }

    // Pad number to 2 digits
    const pad = (n: number): string => (n < 10 ? "0" + n : n.toString());

    // Format date as YYYY-MM-DD
    const formatDate = (date: Date, format: string): string => {
        const days: string[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const months: string[] = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const day: number = date.getDate();
        const weekday: string = days[date.getDay()];
        const month: string = months[date.getMonth()];
        const year: number = date.getFullYear();
        const weekNumber: number = getWeekNumber(date);
        const ordinal = (n: number): string => {
            if (n > 3 && n < 21) return n + "th";
            switch (n % 10) {
                case 1: return n + "st";
                case 2: return n + "nd";
                case 3: return n + "rd";
                default: return n + "th";
            }
        };

        return format
            .replace("YYYY", year.toString())
            .replace("MMMM", month)
            .replace("MM", pad(date.getMonth() + 1))
            .replace("Do", ordinal(day))
            .replace("dddd", weekday)
            .replace("DD", pad(day))
            .replace("WW", pad(weekNumber))
            .replace("W", weekNumber.toString());
    };

    const getWeekNumber = (date: Date): number => {
        const temp: Date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum: number = temp.getUTCDay() || 7;
        temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
        const yearStart: Date = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
        return Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    const addDays = (date: Date, days: number): Date => {
        const copy: Date = new Date(date);
        copy.setDate(copy.getDate() + days);
        return copy;
    };

    const template = `---
graph-key: journal
date: {{DATE}}
---

# Summary
## Activities
\`\`\`dataviewjs
// Get activities for this day
const pages = dv.pages('"Personal/Journal/Activities"')
    .where(p =>
        moment(new Date(p.date)).format("YYYY-MM-DD") ===
        moment(new Date(dv.current().date)).format("YYYY-MM-DD")
    );

// Display the table if there are results
if (pages.length > 0) {
    // Transform data
    const data = pages.map(p => {
	    // Determine activity
        let activity = "?";
        if (p.type === "gaming") {
            activity = p.game;
        }
        if (p.type === "exercise") {
            activity = p.exercise;
        }
        if (p.type === "housework") {
            activity = p.job;
        }
        const link = \`[[\${p.file.name}|\${activity}]]\`;
        const started = p['start-time'] ?? "?";
        let ended = "?";

        // Calculate end time if available
        if (p['start-time'] && p.duration) {
            const startMoment = 
	            moment(\`1970-01-01T\${p['start-time']}\`, 'YYYY-MM-DDTHH:mm');
            const endMoment = startMoment.clone().add(moment.duration(p.duration));
            ended = endMoment.format("HH:mm");
        }

        return {
            link,
            started: started,
            ended,
            duration: p.duration,
            timezone: p.timezone,
        };
    });

// Sort the data
// Those will start times go in chronological order
// Those without start times go at the end
const sortedData = Array.from(data)
    .sort((a,b) => {
	    if (a.started === '?') {
		    return 0;
	    }
	    if (b.started === '?') {
		    return -1;
	    }
	    if (a.started < b.started) {
		    return -1;
	    }
    });

    // Render the table
    dv.table(
        ["Activity", "Started", "Ended", "Duration", "TZ"],
        sortedData.map(d => [d.link, d.started, d.ended, d.duration, d.timezone])
    );
} else {
    dv.paragraph("No activity records for this day.");
}
\`\`\`

## Exercise
### Calisthenics
\`\`\`dataviewjs
// List the exercises we expect to parse
const exerciseFields = ["chinups", "pullups", "pushups", "situps", "squats", "stepups"];
const datasets = [];

// Pre-defined colors for each exercise type
const exerciseColors = {
    cnipups: "#cf1b1b",
    pullups: "#cf6f1b",
    pushups:  "#cfc91b",
    //unused: "#54cf1b",
    situps: "#1bc3cf",
	squats: "#1b72cf",
	stepups: "#7b1bcf" 
};

// Define the chart day start and end times
const dayStart = "2022-01-01T06:00:00";
const dayEnd = "2022-01-01T23:00:00";

// Loop over each exercise field in the inline data
exerciseFields.forEach(ex => {
    let value = dv.current()[ex];
    let dataPoints = [];
    if (value) {
        // Split in case there are multiple values
        let entries = value.split(",");
        entries.forEach(entry => {
            if (entry.includes("@")) {
                // Split each entry by "@" to get the count and time string
                let parts = entry.split("@");
                let count = parseInt(parts[0].trim());
                let timeStr = parts[1].trim();
                // Use a fixed date to parse the time
                let timeValue = "2022-01-01T" + timeStr + ":00";
                dataPoints.push({ x: timeValue, y: count });
            }
        });
    }
    // Only add a dataset if we have valid data points
    if (dataPoints.length > 0) {
        // Sort data points by time
        dataPoints.sort((a, b) => new Date(a.x) - new Date(b.x));
        // Compute cumulative total for each exercise
        let cumulative = 0;
        dataPoints = dataPoints.map(point => {
            cumulative += point.y;
            return { x: point.x, y: cumulative };
        });
        
        // Add a starting point at the beginning of the day if needed
        if (new Date(dataPoints[0].x) > new Date(dayStart)) {
            dataPoints.unshift({ x: dayStart, y: 0 });
        }
        // Add an ending point at the end of the day if needed
        if (new Date(dataPoints[dataPoints.length - 1].x) < new Date(dayEnd)) {
            dataPoints.push({ x: dayEnd, y: cumulative });
        }
        
        datasets.push({
            label: ex,
            data: dataPoints,
            borderColor: exerciseColors[ex] || "#FF0000",
            backgroundColor: exerciseColors[ex] || "#FF0000",
            fill: false,
            pointRadius: 6,
            tension: 0,  // straight lines
            stepped: true  // enable stepped line interpolation
        });
    }
});

// Create the line chart with cumulative totals and continuous line across the day
const chartData = {
    type: 'line',
    data: { datasets: datasets },
    options: {
        plugins: {
            title: {
                display: true,
                text: "Cumulative Exercise Chart: Total Counts by Time"
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    parser: 'YYYY-MM-DDTHH:mm:ss',
                    unit: 'hour',      // one tick per hour
                    stepSize: 1,
                    displayFormats: {
                        hour: 'HH:mm'
                    }
                },
                min: dayStart,
                max: dayEnd,
                ticks: {
                    autoSkip: false,
                    maxRotation: 60,
                    minRotation: 60
                },
                title: {
                    display: true,
                    text: "Time of Day"
                }
            },
            y: {
                title: {
                    display: true,
                    text: "Cumulative Count"
                },
                beginAtZero: true
            }
        }
    }
};

window.renderChart(chartData, this.container);
\`\`\`
### Taekwondo
\`\`\`dataviewjs
// List the exercises we expect to parse
const exerciseFields = ["tkd-bouncing", "tkd-flexibility", "tkd-forms", "tkd-rolls", "tkd-sparring"];
const datasets = [];

// Pre-defined colors for each exercise type
const exerciseColors = {
    "tkd-bouncing": "#cf1b1b",
    "tkd-flexibility": "#cf6f1b",
    "tkd-forms":  "#cfc91b",
    //unused: "#54cf1b",
    //unused: "#1bc3cf",
	"tkd-rolls": "#1b72cf",
	"tkd-sparring": "#7b1bcf" 
};

// Define the chart day start and end times
const dayStart = "2022-01-01T06:00:00";
const dayEnd = "2022-01-01T23:00:00";

// Loop over each exercise field in the inline data
exerciseFields.forEach(ex => {
    let value = dv.current()[ex];
    let dataPoints = [];
    if (value) {
        // Split in case there are multiple values
        let entries = value.split(",");
        entries.forEach(entry => {
            if (entry.includes("@")) {
                // Split each entry by "@" to get the count and time string
                let parts = entry.split("@");
                let count = parseInt(parts[0].trim());
                let timeStr = parts[1].trim();
                // Use a fixed date to parse the time
                let timeValue = "2022-01-01T" + timeStr + ":00";
                dataPoints.push({ x: timeValue, y: count });
            }
        });
    }
    // Only add a dataset if we have valid data points
    if (dataPoints.length > 0) {
        // Sort data points by time
        dataPoints.sort((a, b) => new Date(a.x) - new Date(b.x));
        // Compute cumulative total for each exercise
        let cumulative = 0;
        dataPoints = dataPoints.map(point => {
            cumulative += point.y;
            return { x: point.x, y: cumulative };
        });
        
        // Add a starting point at the beginning of the day if needed
        if (new Date(dataPoints[0].x) > new Date(dayStart)) {
            dataPoints.unshift({ x: dayStart, y: 0 });
        }
        // Add an ending point at the end of the day if needed
        if (new Date(dataPoints[dataPoints.length - 1].x) < new Date(dayEnd)) {
            dataPoints.push({ x: dayEnd, y: cumulative });
        }
        
        datasets.push({
            label: ex,
            data: dataPoints,
            borderColor: exerciseColors[ex] || "#FF0000",
            backgroundColor: exerciseColors[ex] || "#FF0000",
            fill: false,
            pointRadius: 6,
            tension: 0,  // straight lines
            stepped: true  // enable stepped line interpolation
        });
    }
});

// Create the line chart with cumulative totals and continuous line across the day
const chartData = {
    type: 'line',
    data: { datasets: datasets },
    options: {
        plugins: {
            title: {
                display: true,
                text: "Cumulative Exercise Chart: Total Counts by Time"
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    parser: 'YYYY-MM-DDTHH:mm:ss',
                    unit: 'hour',      // one tick per hour
                    stepSize: 1,
                    displayFormats: {
                        hour: 'HH:mm'
                    }
                },
                min: dayStart,
                max: dayEnd,
                ticks: {
                    autoSkip: false,
                    maxRotation: 60,
                    minRotation: 60
                },
                title: {
                    display: true,
                    text: "Time of Day"
                }
            },
            y: {
                title: {
                    display: true,
                    text: "Cumulative Count"
                },
                beginAtZero: true
            }
        }
    }
};

window.renderChart(chartData, this.container);
\`\`\`
### Kicking
\`\`\`dataviewjs
// List the exercises we expect to parse
const exerciseFields = ["round-houses", "side-kicks", "hook-kicks", "back-kicks", "front-kicks", "crescent-kicks", "axe-kicks"];
const datasets = [];

// Pre-defined colors for each exercise type
const exerciseColors = {
    "round-houses": "#cf1b1b",
    "side-kicks": "#cf6f1b",
    "hook-kicks":  "#cfc91b",
    "back-kicks": "#54cf1b",
	"front-kicks": "#1bc3cf",
	"crescent-kicks": "#1b72cf",
	"axe-kicks": "#7b1bcf" 
};

// Define the chart day start and end times
const dayStart = "2022-01-01T06:00:00";
const dayEnd = "2022-01-01T23:00:00";

// Loop over each exercise field in the inline data
exerciseFields.forEach(ex => {
    let value = dv.current()[ex];
    let dataPoints = [];
    if (value) {
        // Split in case there are multiple values
        let entries = value.split(",");
        entries.forEach(entry => {
            if (entry.includes("@")) {
                // Split each entry by "@" to get the count and time string
                let parts = entry.split("@");
                let count = parseInt(parts[0].trim());
                let timeStr = parts[1].trim();
                // Use a fixed date to parse the time
                let timeValue = "2022-01-01T" + timeStr + ":00";
                dataPoints.push({ x: timeValue, y: count });
            }
        });
    }
    // Only add a dataset if we have valid data points
    if (dataPoints.length > 0) {
        // Sort data points by time
        dataPoints.sort((a, b) => new Date(a.x) - new Date(b.x));
        // Compute cumulative total for each exercise
        let cumulative = 0;
        dataPoints = dataPoints.map(point => {
            cumulative += point.y;
            return { x: point.x, y: cumulative };
        });
        
        // Add a starting point at the beginning of the day if needed
        if (new Date(dataPoints[0].x) > new Date(dayStart)) {
            dataPoints.unshift({ x: dayStart, y: 0 });
        }
        // Add an ending point at the end of the day if needed
        if (new Date(dataPoints[dataPoints.length - 1].x) < new Date(dayEnd)) {
            dataPoints.push({ x: dayEnd, y: cumulative });
        }
        
        datasets.push({
            label: ex,
            data: dataPoints,
            borderColor: exerciseColors[ex] || "#FF0000",
            backgroundColor: exerciseColors[ex] || "#FF0000",
            fill: false,
            pointRadius: 6,
            tension: 0,  // straight lines
            stepped: true  // enable stepped line interpolation
        });
    }
});

// Create the line chart with cumulative totals and continuous line across the day
const chartData = {
    type: 'line',
    data: { datasets: datasets },
    options: {
        plugins: {
            title: {
                display: true,
                text: "Cumulative Exercise Chart: Total Counts by Time"
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    parser: 'YYYY-MM-DDTHH:mm:ss',
                    unit: 'hour',      // one tick per hour
                    stepSize: 1,
                    displayFormats: {
                        hour: 'HH:mm'
                    }
                },
                min: dayStart,
                max: dayEnd,
                ticks: {
                    autoSkip: false,
                    maxRotation: 60,
                    minRotation: 60
                },
                title: {
                    display: true,
                    text: "Time of Day"
                }
            },
            y: {
                title: {
                    display: true,
                    text: "Cumulative Count"
                },
                beginAtZero: true
            }
        }
    }
};

window.renderChart(chartData, this.container);
\`\`\`

## Nutrition
### Daily Nutrients
\`\`\`dataviewjs
// Define the meal fields to process
const meals = ["breakfast", "lunch", "dinner", "snacks"];
// Prepare an array to hold { food, qty } objects.
let foodItems = [];

// Regular expression to capture items like "1x [[Food/Pear|Pear]]" or "4x [[Strawberry]]"
const itemRegex = /(\\d+)\\s*x\\s*\\[\\[([^\\]\\|]+)(?:\\|[^\\]]+)?\\]\\]/gi;

// Loop through each meal field from the current page
for (let meal of meals) {
  let mealField = dv.current()[meal];
  if (mealField) {
    let match;
    // Reset regex index in case it is used multiple times
    itemRegex.lastIndex = 0;
    while ((match = itemRegex.exec(mealField)) !== null) {
      // match[1] is the quantity, match[2] is the link text, e.g. "Food/Pear" or "Strawberry"
      let qty = parseInt(match[1]);
      // Extract the actual food note name (assuming it's the last part of the link)
      let parts = match[2].split("/");
      let foodName = parts[parts.length - 1];
      foodItems.push({ food: foodName, qty });
    }
  }
}

// Get all food pages from the "Food" folder
let foodPages = dv.pages('"Food"').where(page => foodItems.some(item => item.food === page.file.name));

// Build a map from food note name to its page for fast lookup.
let foodMap = {};
for (let page of foodPages) {
  foodMap[page.file.name] = page;
}

// Get the Nutrition Daily Values note
let ndv = dv.page("Nutrition Daily Values");

// List of nutrients to display
let nutrientKeys = [
	'calories',
	'saturated-fat',
	'sodium',
	'dietary-fiber',
	'sugars',
	'protein',
	'calcium',
	'iron',
	'potassium'
];

// Initialize an object to hold the totals for each nutrient.
let nutrientTotals = {};
for (let key of nutrientKeys) {
  nutrientTotals[key] = 0;
}

// Loop over each food item from the meal list and sum nutrient values.
for (let item of foodItems) {
  let page = foodMap[item.food];
  if (!page) continue;
  for (let nutrient of nutrientKeys) {
    let nutrientValue = page[nutrient] || 0;
    nutrientTotals[nutrient] += nutrientValue * item.qty;
  }
}

// Build the table rows with extended columns:
// Column 1: Nutrient
// Column 2: Total (rounded)
// Column 3: Daily Recommended Value (rounded)
// Column 4: Diff (total - recommended; negative if deficit, positive if surplus)
// Column 5: Percent of Daily Value (rounded)
let rows = [];
for (let nutrient of nutrientKeys) {
  let total = nutrientTotals[nutrient];
  let recommended = ndv[nutrient] || 0;
  let diff = total - recommended;
  let percent = recommended !== 0 ? (total / recommended * 100) : 0;
  rows.push({
    nutrient: diff < 0 ? '**'+nutrient+'**' : nutrient,
    total: total !== 0 ? total.toFixed(0) : '0',
    recommended: recommended.toFixed(0),
    diff: diff.toFixed(0),
    percent: percent.toFixed(0) + '%'
  });
}

// Sort the rows so that the largest deficit (most negative diff) appears at the top.
rows.sort((a, b) => parseFloat(a.percent) - parseFloat(b.percent));

// Render the table.
dv.table(
  ["Nutrient", "Total", "Recommended", "Delta", "% of DV"],
  rows.map(row => [row.nutrient, row.total, row.recommended, row.diff, row.percent])
);
\`\`\`
#### Nutrition Information by Deficit or Surplus
\`\`\`dataviewjs
// Define color codes
const colors = {
  recommended: "#1b72cf", // blue   (recommended)
  badDeficit: "#cf6f1b",  // orange (not enough of a good thing)
  goodDeficit: "#54cf1b", // green  (minimizing bad things)
  badSurplus: "#cf1b1b",  // red    (overeating bad things)
  goodSurplus: "#cfc91b"  // yellow (eating more of a good thing)
};

// Define the meal fields to process
const meals = ["breakfast", "lunch", "dinner", "snacks"];

// List of nutrients to display
let nutrientsToMinimize = [
	'calories',
	'saturated-fat',
	'sodium',
	'added-sugars'
];
let nutrientsToMaximize = [
	'dietary-fiber',
	'protein',
	'calcium',
	'iron',
	'potassium'
];
// Combine both groups into one array of nutrient keys.
let nutrientKeys = nutrientsToMinimize.concat(nutrientsToMaximize);

// Prepare an array to hold { food, qty } objects.
let foodItems = [];

// Regular expression to capture items like "1x [[Food/Pear|Pear]]" or "4x [[Strawberry]]"
const itemRegex = /(\\d+)\\s*x\\s*\\[\\[([^\\]\\|]+)(?:\\|[^\\]]+)?\\]\\]/gi;

// Loop through each meal field from the current page
for (let meal of meals) {
  let mealField = dv.current()[meal];
  if (mealField) {
    let match;
    // Reset regex index in case it is used multiple times
    itemRegex.lastIndex = 0;
    while ((match = itemRegex.exec(mealField)) !== null) {
      // match[1] is the quantity, match[2] is the link text
      let qty = parseInt(match[1]);
      // Extract the actual food note name (assuming it's the last part of the link)
      let parts = match[2].split("/");
      let foodName = parts[parts.length - 1];
      foodItems.push({ food: foodName, qty });
    }
  }
}

// Get all food pages from the "Food" folder
let foodPages = dv.pages('"Food"').where(page => foodItems.some(item => item.food === page.file.name));

// Build a map from food note name to its page for fast lookup.
let foodMap = {};
for (let page of foodPages) {
  foodMap[page.file.name] = page;
}

// Get the Nutrition Daily Values note
let ndv = dv.page("Nutrition Daily Values");

// Initialize an object to hold the totals for each nutrient.
let nutrientTotals = {};
for (let key of nutrientKeys) {
  nutrientTotals[key] = 0;
}

// Loop over each food item from the meal list and sum nutrient values.
for (let item of foodItems) {
  let page = foodMap[item.food];
  if (!page) continue;
  for (let nutrient of nutrientKeys) {
    let nutrientValue = page[nutrient] || 0;
    nutrientTotals[nutrient] += nutrientValue * item.qty;
  }
}

// For each nutrient, calculate the percentage of the recommended daily value and determine bar segments.
// For nutrients to maximize: if below 100%, missing portion is "badDeficit" (orange); if above 100%, extra is "goodSurplus" (green).
// For nutrients to minimize: if below 100%, missing portion is "goodDeficit" (cyan); if above 100%, extra is "badSurplus" (red).
// In all cases, the "recommended" portion (up to 100%) is blue.
let nutrientData = nutrientKeys.map(nutrient => {
  let total = nutrientTotals[nutrient];
  let recommended = ndv[nutrient] || 0;
  // Calculate the percent consumed relative to the recommended value.
  let percentConsumed = recommended !== 0 ? (total / recommended * 100) : 0;
  
  // Identify the group for this nutrient.
  let group = nutrientsToMinimize.includes(nutrient) ? "minimize" : "maximize";
  
  // We'll return two segments:
  // - blue: the recommended portion (up to 100%)
  // - adjustment: the remaining percentage, either a deficit or surplus.
  if (percentConsumed <= 100) {
    // Under the recommended value.
    if (group === "maximize") {
      return {
        nutrient,
        blue: percentConsumed,
        adjustment: 100 - percentConsumed,
        adjustmentColor: colors.badDeficit
      };
    } else {
      return {
        nutrient,
        blue: percentConsumed,
        adjustment: 100 - percentConsumed,
        adjustmentColor: colors.goodDeficit
      };
    }
  } else {
    // Exceeding the recommended value.
    if (group === "maximize") {
      return {
        nutrient,
        blue: 100,
        adjustment: percentConsumed - 100,
        adjustmentColor: colors.goodSurplus
      };
    } else {
      return {
        nutrient,
        blue: 100,
        adjustment: percentConsumed - 100,
        adjustmentColor: colors.badSurplus
      };
    }
  }
});

// Prepare arrays for the chart.
let labels = nutrientData.map(d => d.nutrient);
let blueData = nutrientData.map(d => d.blue);
let adjustmentData = nutrientData.map(d => d.adjustment);
let adjustmentColors = nutrientData.map(d => d.adjustmentColor);

// Build the chart data with two datasets: one for the blue (recommended) and one for the adjustment segment.
const chartData = {
  type: 'bar',
  data: {
    labels: labels,
    datasets: [
      {
        label: "Consumed (%)",
        data: blueData,
        backgroundColor: colors.recommended
      },
      {
        label: "Adjustment (%)",
        data: adjustmentData,
        backgroundColor: adjustmentColors
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { 
        position: 'bottom',
        labels: {
          // Generate custom legend items to display all five color definitions.
          generateLabels: function(chart) {
            return [
              {
                text: 'Eaten (%)',
                fillStyle: colors.recommended,
                strokeStyle: colors.recommended,
                hidden: false,
                lineCap: 'butt',
                lineDash: [],
                lineDashOffset: 0,
                lineWidth: 1
              },
              {
                text: 'Bad Deficit',
                fillStyle: colors.badDeficit,
                strokeStyle: colors.badDeficit,
                hidden: false,
                lineCap: 'butt',
                lineDash: [],
                lineDashOffset: 0,
                lineWidth: 1
              },
              {
                text: 'Good Deficit',
                fillStyle: colors.goodDeficit,
                strokeStyle: colors.goodDeficit,
                hidden: false,
                lineCap: 'butt',
                lineDash: [],
                lineDashOffset: 0,
                lineWidth: 1
              },
              {
                text: 'Good Surplus',
                fillStyle: colors.goodSurplus,
                strokeStyle: colors.goodSurplus,
                hidden: false,
                lineCap: 'butt',
                lineDash: [],
                lineDashOffset: 0,
                lineWidth: 1
              },
              {
                text: 'Bad Surplus',
                fillStyle: colors.badSurplus,
                strokeStyle: colors.badSurplus,
                hidden: false,
                lineCap: 'butt',
                lineDash: [],
                lineDashOffset: 0,
                lineWidth: 1
              }
            ];
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) { label += ': '; }
            label += context.parsed.y.toFixed(1) + '%';
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true
      },
      y: {
        stacked: true,
        beginAtZero: true,
        max: Math.max(100, ...blueData.map((d,i) => d + adjustmentData[i])),
        title: {
          display: true,
          text: "% of Daily Value"
        }
      }
    }
  }
};

window.renderChart(chartData, this.container);
\`\`\`
`;

    for (let month = 0; month < 12; month++) {
        for (let day = 1; day <= 31; day++) {
            const date: Date = new Date(year, month, day);
            if (date.getMonth() !== month) break;

            const title: string = formatDate(date, "YYYY-MM-DD");
            const isoDate: string = formatDate(date, "YYYY-MM-DD");

            // Log: Generating file for this date
            console.log(`[log] Generating daily note for ${isoDate}`);

            // Replace the date placeholder in the template
            const content: string = template.replace("{{DATE}}", isoDate);

            // Use new filename format: <YYYY-MM-DD>-Summary.md
            const filePath: string = path.join(outputDir, `${title}-Summary.md`);
            fs.writeFileSync(filePath, content, "utf8");

            // Log: File written
            console.log(`[log] Wrote file: ${filePath}`);
        }
    }

    console.log(`[log] ✅ Daily notes generated in "${outputDir}" for ${year}`);
}

// CLI usage: only run if this file is executed directly
if (require.main === module) {
    const year: number = parseInt(process.argv[2]);
    const outputDir: string | undefined = process.argv[3];
    generateDailySummaries(year, outputDir);
}
