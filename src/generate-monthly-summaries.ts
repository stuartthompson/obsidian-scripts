import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Add global declaration for renderChart to avoid TS errors
declare global {
    interface Window {
        renderChart: (chartData: any, container: any) => void;
    }
}

export function generateMonthlySummaries(year: number, outputDir?: string) {
    outputDir = outputDir || join(__dirname, `../summaries/${year}`);
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    const template = (year: number, month: number) => `---
graph-key: journal
year: ${year}
month: ${month}
---
type:: [[Monthly Summary]]
[[${year}]]
# Health
## Vitals
#### Weight by Day *(${monthName(month)} ${year})*
\`\`\`dataviewjs
// === Configurable Colors ===
const trendLineColor = 'rgba(255, 206, 86, 1)'; // Yellow-ish for trend line

// === Date Range ===
const year = dv.current().year;
const month = dv.current().month;
const startDate = moment(\`\${year}-\${month}\`, "YYYY-M");
const endDate = startDate.clone().endOf("month");

// === Get Pages ===
const journals = dv.pages('"Personal/Journal/Daily"')
    .where(p => p.date >= startDate && p.date <= endDate && p.weight);
console.log(journals);

// === Initialize Daily Weight Data ===
let weightData: { [key: string]: number | null } = {};
for (let d = startDate.clone(); d.isBefore(endDate) || d.isSame(endDate, 'day'); d.add(1, 'day')) {
    weightData[d.format("YYYY-MM-DD")] = null;
}

// === Populate Known Weights ===
journals.forEach((p: any) => {
    let dateKey = moment(p.date.toString(), "YYYY-MM-DD").format("YYYY-MM-DD");
    weightData[dateKey] = p.weight;
});

// === Interpolate Missing Weights ===
let prevWeight: number | null = null;
let nextWeightIndex: number | null = null;
let keys = Object.keys(weightData).sort();

for (let i = 0; i < keys.length; i++) {
    if (weightData[keys[i]] !== null) {
        prevWeight = weightData[keys[i]];
        nextWeightIndex = null;
    } else {
        if (nextWeightIndex === null) {
            for (let j = i + 1; j < keys.length; j++) {
                if (weightData[keys[j]] !== null) {
                    nextWeightIndex = j;
                    break;
                }
            }
        }

        if (prevWeight !== null && nextWeightIndex !== null) {
            let nextWeight = weightData[keys[nextWeightIndex]] as number;
            let daysBetween = nextWeightIndex - i + 1;
            let interpolatedWeight = prevWeight + ((nextWeight - prevWeight) / daysBetween);
            weightData[keys[i]] = parseFloat(interpolatedWeight.toFixed(1));
        } else if (prevWeight !== null) {
            weightData[keys[i]] = prevWeight;
        }
    }
}

// === Compute Average ===
const totalWeight = Object.values(weightData).reduce((sum, w) => sum + (w || 0), 0);
const averageWeight = keys.length > 0 ? parseFloat((totalWeight / keys.length).toFixed(1)) : 0;

// === Prepare Chart Data ===
const labels = keys;
const dataValues = labels.map(date => weightData[date]);
const averageLine = new Array(dataValues.length).fill(averageWeight);

// === Compute Trend Line (Least Squares Regression) ===
function computeTrendLine(yValues: (number | null)[]): number[] {
    const n = yValues.length;
    const xValues = [...Array(n).keys()]; // 0, 1, 2, ...
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + (b ?? 0), 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * (yValues[i] ?? 0), 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return xValues.map(x => parseFloat((slope * x + intercept).toFixed(1)));
}

const trendLine = computeTrendLine(dataValues);

// === Render Chart ===
const chartData = {
    type: 'line',
    data: {
        labels: labels,
        datasets: [
            {
                label: \`Weight\`,
                data: dataValues,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderWidth: 2,
                pointRadius: 2,
                pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                tension: 0.4
            },
            {
                label: \`Monthly Average (\${averageWeight} lbs)\`,
                data: averageLine,
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                pointRadius: 0
            },
            {
                label: \`Trend Line\`,
                data: trendLine,
                borderColor: trendLineColor,
                borderWidth: 2,
                borderDash: [5, 5], // dashed line
                pointRadius: 0
            }
        ]
    },
    options: {
        responsive: true,
        scales: {
            x: { title: { display: true, text: "Date" } },
            y: { title: { display: true, text: "Weight (lbs)" }, beginAtZero: false }
        }
    }
};

window.renderChart(chartData, this.container);
\`\`\`
`;

    for (let month = 1; month <= 12; month++) {
        const fileName = `${year}-${String(month).padStart(2, '0')}-summary.md`;
        const filePath = join(outputDir, fileName);
        writeFileSync(filePath, template(year, month));
        console.log(`Generated: ${filePath}`);
    }
}

function monthName(month: number): string {
    return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
}

// Example usage
// const year = parseInt(process.argv[2], 10);
// if (isNaN(year)) {
//     console.error('Please provide a valid year as an argument.');
//     process.exit(1);
// }
// generateMonthlySummaries(year);
