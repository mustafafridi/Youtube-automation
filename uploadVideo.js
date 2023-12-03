const express = require('express');
const { google } = require('googleapis');
const opn = require('opn');
const path = require('path');
const readline = require('readline');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Replace these values with your own credentials
const CLIENT_ID = '';
const CLIENT_SECRET = '';
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Set up a simple route to initiate the OAuth 2.0 flow
app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.force-ssl']
  });

  res.redirect(authUrl);
});

// Callback route to handle the OAuth 2.0 response
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log('Authorization successful!');

    // You can now use oauth2Client to make YouTube API requests

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    // Example: List the user's YouTube channels
    const channelsResponse = await youtube.channels.list({
      mine: true,
      part: 'snippet,contentDetails'
    });

    const channels = channelsResponse.data.items;
    if (channels.length > 0) {
      console.log('Channels:');
      channels.forEach(channel => {
        console.log(`${channel.snippet.title} (${channel.id})`);
      });

      // Example: Upload a video
      const videoPath = path.join(__dirname, 'test.mp4');
      if (fs.existsSync(videoPath)) {
        const videoInsertResponse = await youtube.videos.insert({
          part: 'snippet,status',
          resource: {
            snippet: {
              title: 'Test Video',
              description: 'This is a test video uploaded via YouTube API.'
            },
            status: {
              privacyStatus: 'private' // You can change this to 'public' if desired
            }
          },
          media: {
            body: fs.createReadStream(videoPath)
          }
        });

        const videoId = videoInsertResponse.data.id;
        console.log(`Video uploaded successfully! Video ID: ${videoId}`);
      } else {
        console.error('Video file not found.');
      }
    } else {
      console.log('No channels found.');
    }

    res.send('Authorization successful! You can close this window.');
  } catch (error) {
    console.error('Error getting tokens:', error.message);
    res.status(500).send('Error during authorization.');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  opn(`http://localhost:${PORT}/auth`);
});