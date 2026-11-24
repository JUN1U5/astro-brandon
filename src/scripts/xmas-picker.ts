type Episode = {
  Series: string;
  Episode: string;
  Season: string;
  Rating: string;
  Length: string;
  Notes: string;
};

const WATCHED_STORAGE_KEY = "watchedEpisodes";

let episodes: Episode[] = [];

function escapeHTML(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

  return lines
    .slice(1)
    .filter((line) => line.trim() !== "")
    .map((line) => {
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

function getEpisodeId(episode: Episode): string {
  return `${episode.Series}__${episode.Season}__${episode.Episode}`
    .trim()
    .toLowerCase();
}

function getWatchedEpisodes(): Set<string> {
  const stored = localStorage.getItem(WATCHED_STORAGE_KEY);

  if (!stored) {
    return new Set();
  }

  try {
    const parsed = JSON.parse(stored) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveWatchedEpisodes(watched: Set<string>): void {
  localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify([...watched]));
}

function markEpisodeAsWatched(episode: Episode): void {
  const watched = getWatchedEpisodes();
  watched.add(getEpisodeId(episode));
  saveWatchedEpisodes(watched);
}

function resetWatchedEpisodes(): void {
  localStorage.removeItem(WATCHED_STORAGE_KEY);
}

function getWatchedEpisodeObjects(): Episode[] {
  const watched = getWatchedEpisodes();
  return episodes.filter((episode) => watched.has(getEpisodeId(episode)));
}

function getUnwatchedEpisodes(): Episode[] {
  const watched = getWatchedEpisodes();
  return episodes.filter((episode) => !watched.has(getEpisodeId(episode)));
}

function pickRandomEpisodes(source: Episode[], count: number): Episode[] {
  const pool = [...source];
  const selected: Episode[] = [];

  while (pool.length > 0 && selected.length < count) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    const [picked] = pool.splice(randomIndex, 1);
    selected.push(picked);
  }

  return selected;
}

function renderWatchedList(watchedContainer: HTMLElement): void {
  const watchedEpisodes = getWatchedEpisodeObjects();

  if (watchedEpisodes.length === 0) {
    watchedContainer.innerHTML = `<p>No watched episodes yet.</p>`;
    return;
  }

  watchedContainer.innerHTML = `
    <ul class="watched-items">
      ${watchedEpisodes
        .map(
          (episode) => `
            <li class="watched-item">
              <strong>${escapeHTML(episode.Series)}</strong> —
              ${escapeHTML(episode.Episode)} (Season ${escapeHTML(episode.Season)})
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderCards(
  cardsContainer: HTMLElement,
  watchedContainer: HTMLElement,
  selectedEpisodes: Episode[]
): void {
  if (selectedEpisodes.length === 0) {
    cardsContainer.innerHTML = `
      <div class="empty-state">
        <p>You've marked everything as watched.</p>
        <button id="reset-watched-btn" type="button">Reset Watched</button>
      </div>
    `;

    const resetButton = document.getElementById("reset-watched-btn");
    if (resetButton instanceof HTMLButtonElement) {
      resetButton.addEventListener("click", () => {
        resetWatchedEpisodes();
        renderRandomCards(cardsContainer, watchedContainer);
      });
    }

    renderWatchedList(watchedContainer);
    return;
  }

  cardsContainer.innerHTML = selectedEpisodes
    .map(
      (episode) => `
        <article class="card">
          <h2>${escapeHTML(episode.Series || "Untitled")}</h2>
          <div class="field"><span class="label">Episode:</span> ${escapeHTML(episode.Episode || "N/A")}</div>
          <div class="field"><span class="label">Season:</span> ${escapeHTML(episode.Season || "N/A")}</div>
          <div class="field"><span class="label">Rating:</span> <span class="stars">${formatRatingAsStars(episode.Rating)}</span></div>
          <div class="field"><span class="label">Length:</span> ${escapeHTML(episode.Length || "N/A")}</div>
          <div class="field"><span class="label">Notes:</span> ${escapeHTML(episode.Notes || "None")}</div>
          <button class="watch-btn" type="button" data-episode-id="${escapeHTML(getEpisodeId(episode))}">
            Mark as watched
          </button>
        </article>
      `
    )
    .join("");

  const watchButtons = cardsContainer.querySelectorAll(".watch-btn");

  watchButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;

    button.addEventListener("click", () => {
      const episodeId = button.dataset.episodeId;
      if (!episodeId) return;

      const episode = episodes.find((ep) => getEpisodeId(ep) === episodeId);
      if (!episode) return;

      markEpisodeAsWatched(episode);
      renderRandomCards(cardsContainer, watchedContainer);
    });
  });

  renderWatchedList(watchedContainer);
}

function renderRandomCards(cardsContainer: HTMLElement, watchedContainer: HTMLElement): void {
  const unwatched = getUnwatchedEpisodes();
  const selected = pickRandomEpisodes(unwatched, 3);
  renderCards(cardsContainer, watchedContainer, selected);
}

async function loadCSV(
  cardsContainer: HTMLElement,
  watchedContainer: HTMLElement,
  rerollButton: HTMLButtonElement
): Promise<void> {
  try {
    const response = await fetch("/episodes.csv");

    if (!response.ok) {
      throw new Error("Could not load CSV file.");
    }

    const csvText = await response.text();
    episodes = parseCSV(csvText);

    if (episodes.length === 0) {
      cardsContainer.innerHTML = `<p class="error">No episodes found in the CSV file.</p>`;
      watchedContainer.innerHTML = `<p>No watched episodes yet.</p>`;
      rerollButton.disabled = true;
      return;
    }

    renderRandomCards(cardsContainer, watchedContainer);
  } catch (error) {
    console.error("Error loading CSV:", error);
    cardsContainer.innerHTML = `<p class="error">Error loading episodes.</p>`;
    rerollButton.disabled = true;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const cardsContainer = document.getElementById("episode-cards");
  const watchedContainer = document.getElementById("watched-list");
  const rerollButton = document.getElementById("reroll-btn");

  if (!(cardsContainer instanceof HTMLElement)) return;
  if (!(watchedContainer instanceof HTMLElement)) return;
  if (!(rerollButton instanceof HTMLButtonElement)) return;

  rerollButton.addEventListener("click", () => {
    renderRandomCards(cardsContainer, watchedContainer);
  });

  loadCSV(cardsContainer, watchedContainer, rerollButton);
});