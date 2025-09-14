const express = require('express');
const router = express.Router();
require('dotenv').config();

// Endpoint to mint short-lived client secrets for WebRTC
router.post('/realtime/secret', async (req, res) => {
  try {
    // You could add user authentication here if needed
    // const userId = req.session?.userId;
    // if (!userId) return res.status(401).send('Unauthorized');

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'      },
      body: JSON.stringify({
        type: 'realtime',
        model: 'gpt-realtime',
        audio: {
          voice: 'marin'
        }
        // Optional: expires_in: 60 // seconds
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to create session:', error);
      return res.status(response.status).send(error);
    }

    const data = await response.json();
    
    // Send only the client secret to the frontend
    res.json({ 
      client_secret: data.client_secret.value,
      expires_at: data.client_secret.expires_at 
    });
    
  } catch (error) {
    console.error('Error creating client secret:', error);
    res.status(500).send('Failed to mint client secret');
  }
});

module.exports = router;
