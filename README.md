# YT Amplify Chrome Extension

A powerful Chrome extension that enhances your YouTube experience by allowing you to search and play YouTube songs in a new tab, and maintain a list of your favorite songs.

## Features

- 🔍 Quick YouTube song search in a new tab
- 🎵 Play YouTube songs directly from the extension
- ❤️ Create and manage your favorite songs playlist
- 🎨 Clean and intuitive user interface
- ⚡ Fast and efficient performance

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click the YT Amplify icon in your Chrome toolbar
2. Use the search bar to find YouTube songs
3. Click on any song to play it in a new tab
4. Add songs to your favorites list for quick access

## Technical Details

The extension is built using:
- HTML5
- CSS3
- JavaScript
- Chrome Extension Manifest V3

### Files Structure

- `popup.html` - Main extension popup interface
- `popup.js` - Popup functionality and user interactions
- `popup.css` - Styling for the popup interface
- `background.js` - Background service worker for extension operations
- `content.js` - Content script for YouTube page interactions
- `manifest.json` - Extension configuration and permissions

## Permissions

The extension requires the following permissions:
- `tabs` - For opening new tabs
- `activeTab` - For accessing the current tab
- `scripting` - For executing scripts
- `storage` - For saving user preferences and favorites
- `webRequest` and `webRequestBlocking` - For handling network requests
- `downloads` - For downloading functionality
- YouTube API access

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have suggestions, please open an issue in the repository.

---

Made with ❤️ for YouTube music lovers 
