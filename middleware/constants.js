require('dotenv').config();
// newsapi URLs
const NEWS_URLS = [
   ['google-news', 'https://newsapi.org/v2/top-headlines?country=us&pageSize=5&apiKey=' + process.env.API_KEY],
   // Google news lets you either select country OR domain but not both.
   ['fox-news', 'https://newsapi.org/v2/top-headlines?sources=fox-news&pageSize=5&apiKey=' + process.env.API_KEY]
   //['fox-news', 'https://newsapi.org/v2/everything?domains=foxnews.com&pageSize=5&apiKey=' + process.env.API_KEY]
 ];
 const GOOGLE_NEWS = 0;
 const FOX_NEWS = 1;

module.exports = {
   NEWS_URLS, GOOGLE_NEWS, FOX_NEWS
};