const fs = require('fs');
const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const passport = require('passport');
const twitchStrategy = require('passport-twitch-new').Strategy;
const { ClientCredentialsAuthProvider } = require('@twurple/auth');
const { ChatClient } = require('@twurple/chat');
const { ApiClient } = require('@twurple/api');
const { port, name, clientID, clientSecret, originURL } = require('./config/config');
let mentions = require('./config/mentions');
let words = require('./config/words');

const app = express();

app.set('view engine', 'ejs');

app.use(expressLayouts);
app.use(express.urlencoded({
    extended: true
}));
app.use(session({
    secret: Date.now(),
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/twitch', passport.authenticate('twitch'));
app.get('/auth/twitch/callback', passport.authenticate('twitch', {
    failureRedirect: '/',
    successRedirect: '/'
}));

app.use((req, res, next) => {
    if (req.user) {
        res.locals.user = req.user;
        next();
    } else {
        res.render('login');
    }
})

app.get('/', (req, res) => {
    res.render('mentions', {
        mentions: mentions.slice(0, 10),
        words
    });
});

app.post('/words', (req, res) => {
    words = req.body.words.trim().split(' ');
    fs.writeFileSync(path.join(__dirname, 'config', 'words.json'), JSON.stringify(words, null, 4));
    res.redirect('/');
});

app.post('/clear', (req, res) => {
    mentions.splice(0, req.body.amount);
    res.redirect('/');
});

app.use((req, res) => res.render('404'));

app.listen(port);

passport.use(new twitchStrategy({
    clientID,
    clientSecret,
    callbackURL: `${originURL}/auth/twitch/callback`,
    scope: ['chat:read']
}, async (accessToken, refreshToken, profile, done) => {
    if (profile.login === name) {
        return done(null, profile);
    } else {
        return done(null, false);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

const channels = [];

const authProvider = new ClientCredentialsAuthProvider(clientID, clientSecret);

const apiClient = new ApiClient({ authProvider });

const updateChannelsList = async () => {
    const user = await apiClient.users.getUserByName(name);
    const follows = await apiClient.users.getFollowsPaginated({
        user: user.id
    }).getAll();
    const followedChannels = [name, ...follows.map(({ followedUserName }) => followedUserName)];
    for (const channel of channels) {
        if (!followedChannels.includes(channel)) {
            channels.splice(channels.indexOf(channel), 1);
            chatClient.part(channel);
            console.log(`Left ${channel}'s channel.`);
        }
    }
    for (const channel of followedChannels) {
        if (!channels.includes(channel)) {
            channels.push(channel);
            try {
                await chatClient.join(channel);
            } catch { }
            console.log(`Joined ${channel}'s channel.`);
        }
    }
};
updateChannelsList();
setInterval(updateChannelsList, 1000 * 60 * 30);

const chatClient = new ChatClient({ channels: () => channels });

chatClient.connect();

chatClient.onMessage(async (channel, user, message, msg) => {
    const messageWords = message.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(' ');
    for (const word of words) {
        if (messageWords.includes(word)) {
            mentions.push({
                channel: channel.slice(1),
                user,
                message,
                color: msg.userInfo.color,
                time: Date.now()
            });
            return;
        }
    }
});

setInterval(() => {
    fs.writeFileSync(path.join(__dirname, 'config', 'mentions.json'), JSON.stringify(mentions, null, 4));
}, 1000 * 60);
