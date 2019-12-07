require('dotenv').config();
// newsapi URLs
const NEWS_URLS = [
   ['google-news', 'https://newsapi.org/v2/top-headlines?country=us&pageSize=5&apiKey=' + process.env.API_KEY],
   // Google news lets you either select country OR domain but not both.
   ['fox-news', 'https://newsapi.org/v2/top-headlines?sources=fox-news&pageSize=5&apiKey=' + process.env.API_KEY]
   //['fox-news', 'https://newsapi.org/v2/everything?domains=foxnews.com&pageSize=5&apiKey=' + process.env.API_KEY]
];
const SEARCH_NEWS_URLS = [
   // using the everything endpoint which doesn't support country
   ['google-news', 'https://newsapi.org/v2/everything?language=en&pageSize=5&apiKey=' + process.env.API_KEY],
   ['fox-news', 'https://newsapi.org/v2/everything?sources=fox-news&pageSize=5&apiKey=' + process.env.API_KEY]
];
const GOOGLE_NEWS = 0;
const FOX_NEWS = 1;

const DANDE_ENTITY_ENDPOINT = 'https://api.dandelion.eu/datatxt/nex/v1/?lang=en&min_confidence=0.85&top_entities=3&min_length=4';

module.exports = {
   SEARCH_NEWS_URLS, NEWS_URLS, GOOGLE_NEWS, FOX_NEWS, DANDE_ENTITY_ENDPOINT
};