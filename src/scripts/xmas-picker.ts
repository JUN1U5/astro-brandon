type Episode = {
  Series: string;
  Episode: string;
  Season: string;
  Rating: string;
  Length: string;
  Notes: string;
};

let episodes: Episode[] = [];
let lastIndex = -1;

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function parseCSV(csvText: string): Episode[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() ?? "";
    });

    return {
      Series: row.Series ?? "",
      Episode: row.Episode ?? "",
      Season: row.Season ?? "",
      Rating: row.Rating ?? "",
      Length: row.Length ?? "",
      Notes: row.Notes ?? "",
    };
  });
}

function formatRatingAsStars(rating: string): string {
  const num = Number(rating);
  const maxStars = 5;

  if (!Number.isFinite(num) || num <= 0) {
    return "N/A";
  }

  const clamped = Math.max(0, Math.min(num, maxStars));
  return "★".repeat(clamped) + "☆".repeat(maxStars - clamped);
}

function showRandomEpisode(
  card: HTMLDivElement | HTMLElement,
): void {
  if (episodes.length === 0) return;

  let randomIndex: number;

  if (episodes.length === 1) {
    randomIndex = 0;
  } else {
    do {
      randomIndex = Math.floor(Math.random() * episodes.length);
    } while (randomIndex === lastIndex);
  }

  lastIndex = randomIndex;
  const episode = episodes[randomIndex];

  card.innerHTML = `
    <h2>${escapeHTML(episode.Series || "Untitled")}</h2>
    <div><strong>Episode:</strong> ${escapeHTML(episode.Episode || "N/A")}</div>
    <div><strong>Season:</strong> ${escapeHTML(episode.Season || "N/A")}</div>
    <div><strong>Rating:</strong> <span class="stars">${formatRatingAsStars(episode.Rating)}</span></div>
    <div><strong>Length:</strong> ${escapeHTML(episode.Length || "N/A")}</div>
    <div><strong>Notes:</strong> ${escapeHTML(episode.Notes || "None")}</div>
  `;
}

async function loadCSV(
  card: HTMLDivElement | HTMLElement,
  button: HTMLButtonElement,
): Promise<void> {
  try {
    const response = await fetch("/episodes.csv");

    if (!response.ok) {
      throw new Error("Could not load CSV file.");
    }

    const csvText = await response.text();
    episodes = parseCSV(csvText);

    if (episodes.length === 0) {
      card.innerHTML = `<p>No episodes found in the CSV file.</p>`;
      button.disabled = true;
      return;
    }

    showRandomEpisode(card);
  } catch (error) {
    console.error("Error loading CSV:", error);
    card.innerHTML = `<p>Error loading episodes.</p>`;
    button.disabled = true;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("episode-card");
  const button = document.getElementById("random-btn");

  if (!card || !(button instanceof HTMLButtonElement)) return;

  button.addEventListener("click", () => showRandomEpisode(card));
  loadCSV(card, button);
});