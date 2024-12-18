// Get elements by their IDs
const searchButton = document.getElementById("searchButton");
const songQuery = document.getElementById("songQuery");
const songResults = document.getElementById("songResults");
const backButton = document.getElementById("backButton");
const closeButton = document.getElementById("closeButton");
const favoriteButton = document.getElementById("favoriteButton");
const loadingGif = document.getElementById("loadingGif");

let existingTabId = null;


const gifs = [
  "giphy1.webp",
  "giphy2.webp",
  "giphy3.webp",
  "giphy4.webp",
  "giphy5.webp",
  "giphy6.webp",
  "giphy7.webp",
  "giphy8.webp"
  
];

// Function to load a random GIF
function loadRandomGif() {
  // Get a random index from the array
  const randomIndex = Math.floor(Math.random() * gifs.length);

  // Update the src attribute of the <img> tag
  const gifElement = document.getElementById("loadingGif");
  gifElement.src = gifs[randomIndex];
}

// Call the function to load a random GIF
loadRandomGif();

// Enable search button when user types
songQuery.addEventListener("input", () => {
  searchButton.disabled = !songQuery.value;
});

// Handle search click
searchButton.addEventListener("click", async () => {
  const query = songQuery.value.trim();
  const apiKey = "AIzaSyDuCzPvRCFdiVlL3ya9-Q89K630Odd8rs8";
  const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=10&key=${apiKey}`;

  // Show loading GIF and clear results
  loadingGif.style.display = "block";
  songResults.innerHTML = "";

  try {
    searchButton.disabled = true; // Disable search button during fetch
    const response = await fetch(apiUrl);
    const data = await response.json();

    loadingGif.style.display = "none"; // Hide loading GIF
    searchButton.disabled = false; // Re-enable search button

    songResults.innerHTML = ""; // Clear loading state
    if (data.items && data.items.length > 0) {
      data.items.forEach((item) => {
        const songItem = document.createElement("li");
        songItem.style.display = "flex";
        songItem.style.alignItems = "center";
        songItem.style.marginBottom = "10px";

        // Create thumbnail image
        const thumbnail = document.createElement("img");
        thumbnail.src = item.snippet.thumbnails.default.url;
        thumbnail.alt = item.snippet.title;
        thumbnail.style.width = "50px";
        thumbnail.style.height = "50px";
        thumbnail.style.marginRight = "10px";

        // Create title span
        const title = document.createElement("span");
        title.textContent = item.snippet.title;
        title.style.cursor = "pointer";
        title.onclick = () => playSong(item.id.videoId);

        // Create add/remove button
        const heartButton = document.createElement("button");
        const existingPlaylist = JSON.parse(localStorage.getItem("playlist")) || [];
        const isInPlaylist = existingPlaylist.some((song) => song.videoId === item.id.videoId);

        heartButton.textContent = isInPlaylist ? "♥" : "♥";
        heartButton.style.marginLeft = "auto";
        heartButton.style.color = isInPlaylist ? "#1db954" : "white";
        heartButton.onclick = () => togglePlaylist(item.snippet.title, item.id.videoId, item.snippet.thumbnails.default.url, heartButton);

        // Append elements to the song item
        songItem.appendChild(thumbnail);
        songItem.appendChild(title);
        songItem.appendChild(heartButton);
        songResults.appendChild(songItem);
      });
    } else {
      songResults.innerHTML = "<li>No results found.</li>";
    }
  } catch (error) {
    console.error("Error fetching YouTube API:", error);
    songResults.innerHTML = "<li>Error fetching results. Try again.</li>";
    loadingGif.style.display = "none";
    searchButton.disabled = false;
  }
});

// Add/Remove song from playlist
function togglePlaylist(title, videoId, thumbnail, button) {
  const existingPlaylist = JSON.parse(localStorage.getItem("playlist")) || [];
  const songIndex = existingPlaylist.findIndex((song) => song.videoId === videoId);

  if (songIndex === -1) {
    // Song is not in the playlist, add it
    existingPlaylist.push({ 
      title, 
      videoId, 
      thumbnail,
      timestamp: new Date().toISOString()  // Add timestamp when the song is added
    });
    localStorage.setItem("playlist", JSON.stringify(existingPlaylist));

    button.style.color = "#1db954";
    console.log(`Added to playlist: ${title}`);
  } else {
    // Song is in the playlist, remove it
    existingPlaylist.splice(songIndex, 1);
    localStorage.setItem("playlist", JSON.stringify(existingPlaylist));

    button.style.color = "white";
    console.log(`Removed from playlist: ${title}`);
  }
  console.log("Updated Playlist:", existingPlaylist);

  // If the favorites list is displayed, refresh it
  if (songResults.getAttribute("data-view") === "favorites") {
    displayFavorites();
  }
}


 

// Play song in existing tab or create a new one
// Function to play a song in the YouTube tab
function playSong(videoId) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}&autoplay=1&fs=1`;

  // Retrieve the existing tab ID from storage
  chrome.storage.local.get("existingTabId", (result) => {
    const existingTabId = result.existingTabId || null;

    if (existingTabId !== null) {
      // Check if the stored tab still exists
      chrome.tabs.get(existingTabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          // Tab no longer exists, create a new YouTube tab
          createYouTubeTab(videoUrl);
        } else if (!tab.url.startsWith("https://www.youtube.com")) {
          // Replace non-YouTube tab with YouTube video
          chrome.tabs.update(existingTabId, { url: videoUrl, active: true });
          console.log(`Replaced non-YouTube tab with YouTube: ${existingTabId}`);
        } else {
          // Tab is valid and already a YouTube tab; just update the URL
          chrome.tabs.update(existingTabId, { url: videoUrl, active: true });
          console.log(`Updated existing YouTube tab: ${existingTabId}`);
        }
      });
    } else {
      // No tab is tracked, create a new YouTube tab
      createYouTubeTab(videoUrl);
    }
  });
}

// Function to create a new YouTube tab and store its ID
function createYouTubeTab(url) {
  chrome.tabs.create({ url: url }, (tab) => {
    const newTabId = tab.id;

    // Store the new tab's ID in chrome.storage.local
    chrome.storage.local.set({ existingTabId: newTabId }, () => {
      console.log(`Created new YouTube tab and saved ID: ${newTabId}`);
    });
  });
}

// Listener to reset the tab ID in storage when the YouTube tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get("existingTabId", (result) => {
    if (result.existingTabId === tabId) {
      chrome.storage.local.remove("existingTabId", () => {
        console.log("YouTube tab closed. Resetting tab tracking in storage.");
      });
    }
  });
});

// Debugging: Clear tab ID storage when the extension reloads (optional)
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.remove("existingTabId", () => {
    console.log("Extension installed/reloaded. Cleared stored tab ID.");
  });
});




// Toggle between GIF search and favorite songs
favoriteButton.addEventListener("click", () => {
  const currentView = songResults.getAttribute("data-view");

  // Hide any currently displayed GIF
  const existingGif = document.getElementById("loadingGif");
  if (existingGif) {
    existingGif.style.display = "none"; // Hide the initial or existing GIF
  }

  if (currentView === "favorites") {
    // Switch back to GIF screen
    songResults.setAttribute("data-view", "gif");
    favoriteButton.textContent = "♥";
    favoriteButton.style.fontSize = "30px";
    favoriteButton.style.color = "white";

    // Display a random GIF
    displayGif();
  } else {
    // Display favorite songs
    displayFavorites();
  }
});

// Function to display a random GIF
function displayGif() {
  // Clear previous content
  songResults.innerHTML = "";

  // Select a random GIF from the array
  const randomIndex = Math.floor(Math.random() * gifs.length);
  const randomGif = gifs[randomIndex];

  // Create and display the GIF element
  const gifElement = document.createElement("img");
  gifElement.id = "loadingGif";
  gifElement.src = randomGif; // Use the randomly selected GIF
  gifElement.alt = "Loading GIF";
  gifElement.style.display = "block";
  gifElement.style.margin = "20px auto 0 auto";
  gifElement.style.maxWidth = "100%";

  songResults.appendChild(gifElement);
}

// Function to display favorite songs
function displayFavorites() {
  const favoriteSongs = JSON.parse(localStorage.getItem("playlist")) || [];
  songResults.setAttribute("data-view", "favorites");
  favoriteButton.textContent = "♥";
  favoriteButton.style.fontSize = "30px";
  favoriteButton.style.color = "#1db954";

  // Clear previous results
  songResults.innerHTML = "";

  if (favoriteSongs.length > 0) {
    // Sort songs by timestamp (latest first)
    favoriteSongs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    favoriteSongs.forEach((song) => {
      const songItem = document.createElement("li");
      songItem.style.display = "flex";
      songItem.style.alignItems = "center";
      songItem.style.marginBottom = "10px";

      // Create thumbnail image
      const thumbnail = document.createElement("img");
      thumbnail.src = song.thumbnail;
      thumbnail.alt = song.title;
      thumbnail.style.width = "50px";
      thumbnail.style.height = "50px";
      thumbnail.style.marginRight = "10px";

      // Create title span
      const title = document.createElement("span");
      title.textContent = song.title;
      title.style.cursor = "pointer";
      title.onclick = () => playSong(song.videoId);

      // Create remove button
      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.style.marginLeft = "auto";
      removeButton.onclick = () => removeFromFavorites(song.videoId);

      // Append elements to the song item
      songItem.appendChild(thumbnail);
      songItem.appendChild(title);
      songItem.appendChild(removeButton);
      songResults.appendChild(songItem);
    });
  } else {
    songResults.innerHTML = "<li>No favorite songs found.</li>";
  }
}


// Remove song from favorites
function removeFromFavorites(videoId) {
  let favoriteSongs = JSON.parse(localStorage.getItem("playlist")) || [];
  favoriteSongs = favoriteSongs.filter((song) => song.videoId !== videoId);
  localStorage.setItem("playlist", JSON.stringify(favoriteSongs));
  console.log("Removed from favorites:", videoId);

  // Refresh the favorites list after removal
  displayFavorites();
}


// Back to previous tab
if (backButton) {
  backButton.addEventListener("click", () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const currentTab = tabs.find((tab) => tab.active);
      const previousIndex = currentTab.index > 0 ? currentTab.index - 1 : tabs.length - 1;

      chrome.tabs.update(tabs[previousIndex].id, { active: true }, () => {
        console.log("Returned to the previous tab.");
      });
    });
  });
}



// Close the latest created tab
if (closeButton) {
  closeButton.addEventListener("click", () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const latestTab = tabs.reduce((latest, tab) => {
        return tab.id > latest.id ? tab : latest;
      }, tabs[0]);

      chrome.tabs.remove(latestTab.id, () => {
        console.log("Closed the latest created tab.");
      });
    });
  });
}