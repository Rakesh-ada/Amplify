function sendVideoURL() {
  let videoURL = window.location.href;

  // Only send if it's a YouTube video page
  if (!videoURL.includes("youtube.com/watch")) return;

  console.log("[Content Script] Sending video URL:", videoURL);
  chrome.runtime.sendMessage({ action: "updateVideoURL", url: videoURL });
}

// Detect URL changes (YouTube uses AJAX navigation)
let lastURL = window.location.href;
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastURL) {
    console.log("[Content Script] URL change detected:", window.location.href);
    lastURL = window.location.href;
    sendVideoURL();
  }
});

// Observe body changes since YouTube updates content dynamically
urlObserver.observe(document.body, { childList: true, subtree: true });
console.log("[Content Script] URL MutationObserver started...");

// Function to attach video end listener
function attachVideoEndListener() {
  const video = document.querySelector("video");
  if (video && !video.hasListener) {
    video.addEventListener("ended", handleVideoEnd);
    video.hasListener = true; // Mark the video as having a listener
    console.log("[Content Script] Video end listener attached.");
  }
}

// Function to handle video end event
function handleVideoEnd() {
  console.log("[Content Script] Video ended.");
  chrome.runtime.sendMessage({ action: "videoEnded" });
}

// Periodically check for the video element and attach the listener
setInterval(() => {
  attachVideoEndListener();
}, 1000); // Check every 1 second

// Send URL when page loads
sendVideoURL();