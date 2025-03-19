// Get elements by their IDs
const searchButton = document.getElementById("searchButton");
const songQuery = document.getElementById("songQuery");
const songResults = document.getElementById("songResults");
const backButton = document.getElementById("backButton");
const closeButton = document.getElementById("closeButton");
const favoriteButton = document.getElementById("favoriteButton");
const loadingGif = document.getElementById("loadingGif");
const currentSongDisplay = document.getElementById("currentSongDisplay");
const currentThumbnail = document.getElementById("currentThumbnail");
const currentTitle = document.getElementById("currentTitle");
const addToFavoritesButton = document.getElementById("addToFavoritesButton");
const leftArrow = document.getElementById("leftArrow");
const rightArrow = document.getElementById("rightArrow");
const uploadPlaylistInput = document.getElementById("uploadPlaylistInput");
const uploadPlaylistButton = document.getElementById("uploadPlaylistButton");


const gifs = ["giphy1.webp", "giphy2.webp", "giphy3.webp", "giphy6.webp", "giphy7.webp"];

let isPlaying = false;
let currentFavoriteIndex = 0;
let currentSearchIndex = 0;


document.getElementById("songQuery").addEventListener("mouseenter", function () {
  this.setAttribute("placeholder", "Search for song...");
});

document.getElementById("songQuery").addEventListener("mouseleave", function () {
  this.setAttribute("placeholder", "    Amplify");
});

document.getElementById("songQuery").addEventListener("mouseleave", function () {
  if (!this.value.trim()) { // Only blur if input is empty
    this.blur();
  }
});


// Variable to store the current song details
let currentSong = {
  title: "",
  videoId: "",
  thumbnail: "",
};

// Function to load a random GIF
function loadRandomGif() {
  const randomIndex = Math.floor(Math.random() * gifs.length);
  loadingGif.src = gifs[randomIndex];
}

// Call the function to load a random GIF
loadRandomGif();

// Enable search button when user types
songQuery.addEventListener("input", () => {
  searchButton.disabled = !songQuery.value.trim();
});

// Add event listener for Enter key press on search input
songQuery.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchButton.click();
  }
});

// Handle search click
searchButton.addEventListener("click", async () => {
  const query = songQuery.value.trim();
  const apiKey = "AIzaSyDuCzPvRCFdiVlL3ya9-Q89K630Odd8rs8";
  const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=10&key=${apiKey}`;

  songResults.innerHTML = "";

  try {
    searchButton.disabled = true;
    const response = await fetch(apiUrl);
    const data = await response.json();

    searchButton.disabled = false;

    if (data.items && data.items.length > 0) {
      data.items.forEach((item) => {
        const songItem = document.createElement("div");
        songItem.className = "song-item";

        const thumbnail = document.createElement("img");
        thumbnail.src = item.snippet.thumbnails.medium.url;
        thumbnail.alt = item.snippet.title;

        const title = document.createElement("div");
        title.className = "title";
        title.textContent = item.snippet.title;

        const playButton = document.createElement("button");
        playButton.textContent = "▶";
        playButton.onclick = () => playSong(item.id.videoId);

        const heartButton = document.createElement("button");
        heartButton.textContent = "✚";
        heartButton.onclick = () =>
          togglePlaylist(item.snippet.title, item.id.videoId, item.snippet.thumbnails.medium.url);

        songItem.appendChild(thumbnail);
        songItem.appendChild(title);
        songItem.appendChild(playButton);
        songItem.appendChild(heartButton);
        songResults.appendChild(songItem);
      });

      // Show arrows for navigation
      leftArrow.style.display = "block";
      rightArrow.style.display = "block";
    } else {
      songResults.innerHTML = "<div>No results found.</div>";
    }
  } catch (error) {
    console.error("Error fetching YouTube API:", error);
    songResults.innerHTML = "<div>Error fetching results. Try again.</div>";
    searchButton.disabled = false;
  }
});

// Add/Remove song from playlist
function togglePlaylist(title, videoId, thumbnail) {
  const existingPlaylist = JSON.parse(localStorage.getItem("playlist")) || [];
  const songIndex = existingPlaylist.findIndex((song) => song.videoId === videoId);

  if (songIndex === -1) {
    existingPlaylist.push({
      title,
      videoId,
      thumbnail,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("playlist", JSON.stringify(existingPlaylist));
    console.log(`Added to playlist: ${title}`);
  } else {
    existingPlaylist.splice(songIndex, 1);
    localStorage.setItem("playlist", JSON.stringify(existingPlaylist));
    console.log(`Removed from playlist: ${title}`);
  }

  if (songResults.getAttribute("data-view") === "favorites") {
    displayFavoritesSlideBar();
  }
}

// Play song in existing tab or create a new one
function playSong(videoId) {
  console.log("Playing song with videoId:", videoId);

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}&autoplay=1&fs=1`;

  chrome.storage.local.get("existingTabId", (result) => {
    const existingTabId = result.existingTabId || null;

    if (existingTabId !== null) {
      chrome.tabs.get(existingTabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          createYouTubeTab(videoUrl);
        } else if (!tab.url.startsWith("https://www.youtube.com")) {
          chrome.tabs.update(existingTabId, { url: videoUrl, active: true });
          console.log(`Replaced non-YouTube tab with YouTube: ${existingTabId}`);
        } else {
          chrome.tabs.update(existingTabId, { url: videoUrl, active: true });
          console.log(`Updated existing YouTube tab: ${existingTabId}`);
        }
      });
    } else {
      createYouTubeTab(videoUrl);
    }
  });

  // Fetch and save the current song details
  fetchSongDetails(videoId);
}

// Function to fetch song details (title and thumbnail) using the YouTube Data API
function fetchSongDetails(videoId) {
  const apiKey = "AIzaSyDuCzPvRCFdiVlL3ya9-Q89K630Odd8rs8";
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;

  console.log("Fetching song details for videoId:", videoId);

  fetch(apiUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data.items && data.items.length > 0) {
        const videoDetails = data.items[0].snippet;
        currentSong = {
          title: videoDetails.title,
          videoId: videoId,
          thumbnail: videoDetails.thumbnails.default.url,
        };
        console.log("Updated Current Song:", currentSong);
        displayCurrentSong(currentSong.thumbnail, currentSong.title);
      } else {
        console.error("No video details found for videoId:", videoId);
      }
    })
    .catch((error) => {
      console.error("Error fetching video details:", error);
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

// Toggle between GIF search and favorite songs
favoriteButton.addEventListener("click", () => {
  const currentView = songResults.getAttribute("data-view");

  if (currentView === "favorites") {
    songResults.setAttribute("data-view", "gif");
    favoriteButton.innerHTML = '<span class="heart">≡</span>';
    displayGif();
  } else {
    displayFavoritesSlideBar();
  }
});

function displayGif(thumbnailUrl, title) {
  songResults.innerHTML = "";
  const gifElement = document.createElement("img");
  gifElement.id = "loadingGif";
  gifElement.alt = "";
  gifElement.style.display = "block";
  gifElement.style.margin = "20pxs";
  gifElement.style.maxWidth = "100%";

  if (currentThumbnail.src && currentTitle.textContent) {
    gifElement.src = "equalizer.gif";
  } else {
    gifElement.src = "equalizer.png";
  }

  songResults.appendChild(gifElement);
  leftArrow.style.display = "none";
  rightArrow.style.display = "none";
}

// Function to navigate through the list
function navigateList(direction) {
  const list = songResults;
  const scrollAmount = direction * 165.70; // Adjust this value based on your item width
  list.scrollBy({ left: scrollAmount, behavior: "smooth" });
}

// Add event listeners for arrow buttons
leftArrow.addEventListener("click", () => navigateList(-1));
rightArrow.addEventListener("click", () => navigateList(1));

// Remove song from favorites
function removeFromFavorites(videoId) {
  let favoriteSongs = JSON.parse(localStorage.getItem("playlist")) || [];
  favoriteSongs = favoriteSongs.filter((song) => song.videoId !== videoId);
  localStorage.setItem("playlist", JSON.stringify(favoriteSongs));
  console.log("Removed from favorites:", videoId);

  displayFavoritesSlideBar();
}

// Function to display favorite songs as a slide bar
function displayFavoritesSlideBar() {
  const favoriteSongs = JSON.parse(localStorage.getItem("playlist")) || [];
  songResults.setAttribute("data-view", "favorites");
  favoriteButton.innerHTML = '<span class="heart" style="color: #1db954;">≡</span>';

  songResults.innerHTML = "";

  if (favoriteSongs.length > 0) {
    favoriteSongs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    favoriteSongs.forEach((song, index) => {
      const songItem = document.createElement("div");
      songItem.className = "song-item";

      const thumbnail = document.createElement("img");
      thumbnail.src = song.thumbnail;
      thumbnail.alt = song.title;

      const title = document.createElement("div");
      title.className = "title";
      title.textContent = song.title;

      const playButton = document.createElement("button");
      playButton.textContent = "▶";
      playButton.onclick = () => playSong(song.videoId);

      const removeButton = document.createElement("button");
      removeButton.textContent = "✖";
      removeButton.onclick = () => removeFromFavorites(song.videoId);

      songItem.appendChild(thumbnail);
      songItem.appendChild(title);
      songItem.appendChild(playButton);
      songItem.appendChild(removeButton);
      songResults.appendChild(songItem);
    });

    leftArrow.style.display = "block";
    rightArrow.style.display = "block";
  } else {
    songResults.innerHTML = "<div>No Playlist Found</div>";
    leftArrow.style.display = "none";
    rightArrow.style.display = "none";
  }
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

if (closeButton) {
  closeButton.addEventListener("click", () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      // Filter tabs to only include YouTube tabs
      const youtubeTabs = tabs.filter(tab => tab.url.includes("www.youtube.com"));

      if (youtubeTabs.length > 0) {
        // Find the latest YouTube tab
        const latestYouTubeTab = youtubeTabs.reduce((latest, tab) => (tab.id > latest.id ? tab : latest), youtubeTabs[0]);

        // Close the latest YouTube tab
        chrome.tabs.remove(latestYouTubeTab.id, () => {
          console.log("Closed the latest YouTube tab.");
        });
      } else {
        console.log("No YouTube tabs found to close.");
      }
    });
  });
}

// Display current song details
function displayCurrentSong(thumbnailUrl, title) {
  if (thumbnailUrl && title) {
    currentThumbnail.src = thumbnailUrl;
    currentTitle.textContent = title;
    currentSongDisplay.style.display = "flex";
    loadingGif.src = "equalizer.gif"; // Show equalizer GIF when song is playing
  } else {
    // Set default thumbnail and title when no song is playing
    currentThumbnail.src = "jjk.gif"; // Default thumbnail
    currentTitle.textContent = "No song currently playing";
    currentSongDisplay.style.display = "flex";
    loadingGif.src = "equalizer.png"; // Show static PNG when no song is playing
  }
}

// Add current song to favorites
addToFavoritesButton.addEventListener("click", () => {
  if (!currentSong || !currentSong.videoId) {
    console.error("No valid song found!", currentSong);
    alert("No song selected. Please play a song first.");
    return;
  }

  console.log("Current Song Data:", JSON.stringify(currentSong, null, 2));

  let existingPlaylist = JSON.parse(localStorage.getItem("playlist")) || [];
  let isInPlaylist = existingPlaylist.some(song => song.videoId === currentSong.videoId);

  if (!isInPlaylist) {
    existingPlaylist.push({
      title: currentSong.title,
      videoId: currentSong.videoId,
      thumbnail: currentSong.thumbnail,
      timestamp: new Date().toISOString(),
    });

    localStorage.setItem("playlist", JSON.stringify(existingPlaylist));
    console.log("Updated Playlist:", existingPlaylist);
  } else {
    console.log("Song is already in the playlist.");
  }

  addToFavoritesButton.textContent = "✓";
  setTimeout(() => {
    addToFavoritesButton.textContent = "✚";
  }, 1000);
});

// Extract video ID from URL
function extractVideoId(url) {
  const regex = /(?:v=|\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Listen for real-time updates from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateCurrentSong" && message.details) {
    currentSong = {
      title: message.details.title,
      videoId: message.details.videoId,
      thumbnail: message.details.thumbnailUrl,
    };
    console.log("Updated Current Song:", currentSong);
    displayCurrentSong(currentSong.thumbnail, currentSong.title);
  }
});

// Fetch the current song details when the popup is opened
chrome.runtime.sendMessage({ action: "getVideoDetails" }, (response) => {
  if (response && response.success) {
    currentSong = {
      title: response.details.title,
      videoId: response.details.videoId,
      thumbnail: response.details.thumbnailUrl,
    };
    console.log("Fetched Current Song:", currentSong);
    displayCurrentSong(currentSong.thumbnail, currentSong.title);
    loadingGif.src = "playing.webp"; // Display playing.gif when a song is detected
  } else {
    console.error("Error fetching current song details:", response?.error);
    displayCurrentSong(null, null); // Display default thumbnail and message
  }
});

document.getElementById("downloadPlaylistButton").addEventListener("click", () => {
  const playlist = JSON.parse(localStorage.getItem("playlist")) || [];

  if (playlist.length === 0) {
    alert("No saved songs in the playlist.");
    return;
  }

  // Convert the playlist to a JSON string
  const playlistJson = JSON.stringify(playlist, null, 2);
  const blob = new Blob([playlistJson], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  // Use Chrome's downloads API
  chrome.downloads.download({
    url: url,
    filename: "playlist.json",
    saveAs: true
  }, () => {
    console.log("Playlist downloaded successfully.");
    URL.revokeObjectURL(url); // Free memory
  });
});



// Function to reset the playlist and restart the background script
function resetToDefault() {
  // Clear the playlist from localStorage and chrome.storage.local
  localStorage.removeItem("playlist");
  chrome.storage.local.set({ playlist: null, currentIndex: 0 }, () => {
    console.log("Playlist reset to default.");

    // Restart the background script
    chrome.runtime.reload();

    // Reset the button icon and save the state
    uploadPlaylistButton.innerHTML = '⇧'; // Set to "Upload Playlist" icon
    uploadPlaylistButton.onclick = () => uploadPlaylistInput.click();
    chrome.storage.local.set({ buttonState: "default" }); // Save button state
  });
}

// Handle file upload
uploadPlaylistInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const playlist = JSON.parse(e.target.result);

      // Validate the uploaded playlist
      if (!Array.isArray(playlist) || playlist.length === 0) {
        alert("Invalid playlist format! The file must contain a non-empty array of songs.");
        return;
      }

      // Clear the existing playlist and reset the index
      chrome.storage.local.set({ playlist: null, currentIndex: 0 }, () => {
        console.log("Old playlist removed.");

        // Set the new playlist in localStorage
        localStorage.setItem("playlist", JSON.stringify(playlist));

        // Set the new playlist in chrome.storage.local
        chrome.storage.local.set({ playlist }, () => {
          console.log("New playlist uploaded:", playlist);

          // Update the button icon and save the state
          uploadPlaylistButton.innerHTML = '↺'; // Set to "Back to Default" icon
          uploadPlaylistButton.onclick = resetToDefault;
          chrome.storage.local.set({ buttonState: "uploaded" }); // Save button state

          // Update the UI to reflect the new playlist
          displayFavoritesSlideBar();

          // Notify the background script to start the new playlist
          chrome.runtime.sendMessage({ action: "startPlaylist" });
        });
      });
    } catch (error) {
      console.error("Error reading JSON:", error);
      alert("Failed to read the playlist file. Ensure it is a valid JSON file.");
    }
  };
  reader.readAsText(file);
});

// Initialize the button behavior based on saved state
chrome.storage.local.get("buttonState", (data) => {
  const buttonState = data.buttonState || "default"; // Default to "default" state

  if (buttonState === "uploaded") {
    // Set to "Back to Default" icon
    uploadPlaylistButton.innerHTML = '↺';
    uploadPlaylistButton.onclick = resetToDefault;
  } else {
    // Set to "Upload Playlist" icon
    uploadPlaylistButton.innerHTML = '⇧';
    uploadPlaylistButton.onclick = () => uploadPlaylistInput.click();
  }
});

// Initialize the view
displayCurrentSong();
displayGif();