# Mentions
A web app for seeing your recent Twitch chat mentions and/or other tracked words amongst channels you follow.

# Requirements
- NodeJS.
- Client ID and secret from the [Twitch Developer Console](https://dev.twitch.tv/console).

# Usage
- On your [Twitch Developer Console](https://dev.twitch.tv/console) app, set the callback redirect URL to `http://localhost:3000/auth/twitch/callback`.
- Run `npm i` to install dependencies.
- Copy `default_config.json` and rename it `config.json`.
- Open it and fill out your Twitch name, client ID and client secret. Change the port if you're hosting this on a VPS.
- Run `npm start` or `node .` to start the app.
- Open http://localhost:3000 and login.
