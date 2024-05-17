require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api')
const telegram_token = process.env.TELEGRAM_TOKEN
const genius_token = process.env.GENIUS_TOKEN


const bot = new TelegramBot(telegram_token, { polling: true });

async function getLyrics(artist, songTitle) {
    try {
        const searchUrl = `https://api.genius.com/search?q=${encodeURIComponent(artist + ' ' + songTitle)}`;
        const headers = { 'Authorization': `Bearer ${genius_token}` };

        const searchResponse = await axios.get(searchUrl, { headers });
        console.log('Search Response:', searchResponse.data);

        if (searchResponse.data.response.hits.length === 0) {
            return null;
        }

        const songPath = searchResponse.data.response.hits[0].result.api_path;
        const songUrl = `https://genius.com${songPath}`;
        
        // Fetch the song page
        const songPageResponse = await axios.get(songUrl);
        const $ = cheerio.load(songPageResponse.data);

        // Scrape the lyrics from the page
        const lyrics = $('.lyrics').text().trim() || $('[class^="Lyrics__Container"]').text().trim();

        return lyrics || 'Lyrics not found.';

    } catch (error) {
        console.error('Error fetching lyrics:', error);
        return 'Error fetching lyrics.';
    }
}


bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    const [artist, song] = text.split(' - ');

    if (artist && song) {
        const lyrics = await getLyrics(artist.trim(), song.trim());
        if (lyrics) {
            // Split the lyrics into sections based on square brackets
            const sections = lyrics.split(/\[(.*?)\]/).filter(section => section.trim() !== '');

            let formattedLyrics = '';

            // Loop through each section and add the appropriate formatting
            for (let i = 0; i < sections.length; i += 2) {
                formattedLyrics += `[${sections[i].trim()}]\n${sections[i + 1].trim()}\n\n`;
            }

            bot.sendMessage(chatId, `Lyrics for ${artist} - ${song}:\n\n${formattedLyrics}`);
        } else {
            bot.sendMessage(chatId, `Sorry, I couldn't find lyrics for "${artist} - ${song}".`);
        }
    } else {
        bot.sendMessage(chatId, 'Please provide the artist and song in the format "artist - song".');
    }
});


//  bot.sendMessage(chatId, `Lyrics for ${artist} - ${song}:\n\n${formattedLyrics}`);