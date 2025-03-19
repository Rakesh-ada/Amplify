let currentTabId = null;
let currentVideoId = null;
let currentIndex = 0;

// Function to fetch video details from YouTube Data API
function fetchVideoDetails(videoId, callback) {
  const apiKey = "AIzaSyDuCzPvRCFdiVlL3ya9-Q89K630Odd8rs8"; // Replace with your API key
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
  console.log("Fetching video details for video ID:", videoId);

  fetch(apiUrl)
    .then((response) => response.json())
    .then((data) => {
      console.log("API Response:", data);
      if (data.items && data.items.length > 0) {
        const videoDetails = data.items[0].snippet;
        callback({
          success: true,
          details: {
            title: videoDetails.title,
            thumbnailUrl: videoDetails.thumbnails.high.url,
            videoId: videoId,
          },
        });
      } else {
        console.error("No video details found for video ID:", videoId);
        callback({ success: false, error: "No video details found." });
      }
    })
    .catch((error) => {
      console.error("Fetch Error:", error);
      callback({ success: false, error: error.message });
    });
}

// Function to extract video ID from URL using regex
function extractVideoId(url) {
  const regex = /(?:v=|\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  console.log("Extracted Video ID:", match ? match[1] : null);
  return match ? match[1] : null;
}

// Function to check for changes in the YouTube tab
function checkYouTubeTab(tab) {
  if (tab.url && tab.url.includes("youtube.com/watch")) {
    const newVideoId = extractVideoId(tab.url);
    if (newVideoId && newVideoId !== currentVideoId) {
      currentVideoId = newVideoId;
      currentTabId = tab.id;
      console.log("Current Video ID Updated:", currentVideoId);
      fetchVideoDetails(newVideoId, (response) => {
        if (response.success) {
          // Send the updated video details to the popup
          chrome.runtime.sendMessage({
            action: "updateCurrentSong",
            details: response.details,
          });
        } else {
          console.error("Error fetching video details:", response.error);
        }
      });
    }
  }
}

// Function to periodically check all tabs for YouTube videos
function checkAllYouTubeTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.url && tab.url.includes("youtube.com/watch")) {
        checkYouTubeTab(tab);
      }
    });
  });
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && tab.url && tab.url.includes("youtube.com/watch")) {
    currentTabId = tabId;
    checkYouTubeTab(tab);
  }
});

// Listen for tab switches
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url && tab.url.includes("youtube.com/watch")) {
      currentTabId = activeInfo.tabId;
      checkYouTubeTab(tab);
    }
  });
});

// Listen for network requests to detect video changes
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.tabId !== -1 && details.url.includes("youtube.com/watch")) {
      const newVideoId = extractVideoId(details.url);
      if (newVideoId && newVideoId !== currentVideoId) {
        currentVideoId = newVideoId;
        console.log("Current Video ID Updated (Background):", currentVideoId);
        fetchVideoDetails(newVideoId, (response) => {
          if (response.success) {
            // Send the updated video details to the popup
            chrome.runtime.sendMessage({
              action: "updateCurrentSong",
              details: response.details,
            });
          } else {
            console.error("Error fetching video details:", response.error);
          }
        });
      }
    }
  },
  { urls: ["*://www.youtube.com/watch*"] }
);

// Periodically check all YouTube tabs (e.g., every 10 seconds)
setInterval(checkAllYouTubeTabs, 5000);

// Save currentIndex to Chrome's local storage
function saveCurrentIndex() {
  chrome.storage.local.set({ currentIndex });
}

// Load currentIndex from Chrome's local storage
function loadCurrentIndex() {
  chrome.storage.local.get("currentIndex", (data) => {
    currentIndex = data.currentIndex || 0;
  });
}

// Call loadCurrentIndex when the script starts
loadCurrentIndex();

// Function to play the next song in the saved playlist
function playNextSongFromPlaylist() {
  // Fetch the latest playlist from Chrome's local storage
  chrome.storage.local.get("playlist", (data) => {
    const playlist = data.playlist || [];

    if (playlist.length === 0) {
      console.error("No songs in the playlist.");
      return;
    }

    // Reset currentIndex if it exceeds the playlist length
    if (currentIndex >= playlist.length) {
      currentIndex = 0;
    }

    // Get the next song from the updated playlist
    const nextSong = playlist[currentIndex];

    if (!nextSong || !nextSong.videoId) {
      console.error("Invalid song data in the playlist.");
      return;
    }

    // Construct the YouTube video URL
    const videoUrl = `https://www.youtube.com/watch?v=${nextSong.videoId}&autoplay=1&fs=1`;

    // Update the current tab with the new video URL
    if (currentTabId) {
      chrome.tabs.update(currentTabId, { url: videoUrl, active: true }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error("Error updating tab:", chrome.runtime.lastError);
        } else {
          console.log("Playing next song:", nextSong.title);
          currentIndex++; // Increment index for the next song
          saveCurrentIndex(); // Save the updated index
        }
      });
    } else {
      console.error("No active YouTube tab found.");
    }
  });
}

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "videoEnded") {
    playNextSongFromPlaylist(); // Play the next song in order
  } else if (message.action === "getVideoDetails") {
    if (currentVideoId) {
      fetchVideoDetails(currentVideoId, (response) => {
        sendResponse(response);
      });
      return true; // Required for async response
    } else {
      console.log("No active YouTube video found.");
      sendResponse({ success: false, error: "No active YouTube video found." });
      return true;
    }
  }
});

// Listen for tab closure
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabId === currentTabId) {
    // The YouTube tab was closed
    currentTabId = null;
    currentVideoId = null;

    // Clear the thumbnail and update the UI
    chrome.runtime.sendMessage({
      action: "clearCurrentSong",
    });

    console.log("YouTube tab closed. Thumbnail and UI cleared.");
  }
});