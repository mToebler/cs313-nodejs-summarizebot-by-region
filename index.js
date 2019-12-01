const express = require('express');
const path = require('path');
const url = require('url');
const NewsAPI = require('newsapi');
var Promise = require('promise/lib/es6-extensions');
const fetch = require('isomorphic-fetch');
var AYLIENTextAPI = require('aylien_textapi');

// parsing env variables
// these consts should be in ALL_CAPS
require('dotenv').config();
const PORT = process.env.PORT || 5000;
const newsapi = new NewsAPI(process.env.API_KEY);
const nytapi = process.env.NYT_API;
const alyienAppId = process.env.ALYEN_APP_ID;
const alyienAPI = process.env.ALYEN_API;
const dandAPI = process.env.DAND_API;

// PG database
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

var textapi = new AYLIENTextAPI({
  application_id: alyienAppId,
  application_key: alyienAPI
});


// these should go in different file. for now though...
// darn js's lack of associative arrays!
const NEWS_URLS = [
  ['google-news', 'https://newsapi.org/v2/top-headlines?country=us&pageSize=5&apiKey=' + process.env.API_KEY],
  // Google news lets you either select country OR domain but not both.
  ['fox-news', 'https://newsapi.org/v2/everything?domains=foxnews.com&pageSize=5&apiKey=' + process.env.API_KEY]
];
const GOOGLE_NEWS = 0;
const FOX_NEWS = 1;

express()
  .use(express.static(path.join(__dirname, 'public')))
  // for parsing application/x-www-form-urlencoded
  .use(express.urlencoded({ extended: true }))
  // defining the views path. this is required for templates.
  .set('views', path.join(__dirname, 'views'))
  // setting view engine to ejs. If pug, then we'd just replace ejs with pug
  // this is also required for templates.
  .set('view engine', 'ejs')
  // setting up the webroot, RR-TNT console
  .get('/nyt', (req, res) => {
    nyTimesMostViewed().then(results => { res.send(results) });
  })
  .get('/fox', (req, res) => {
    //newsApiPopularFox().then(results => { res.send(results) });
    fetchNewsApi(FOX_NEWS).then(results => { res.send(results) });
  })
  .get('/googlenews', (req, res) => {
    fetchNewsApi(GOOGLE_NEWS).then(results => { res.send(results) });
  })
  .get('/alyen', (req, res) => {
    textapi.sentiment({
      // 'text': 'Google Fires 4 Workers Active in Labor Organizing'
      'url': 'https://www.nytimes.com/2019/11/26/us/politics/trump-whistle-blower-complaint-ukraine.html'
      //https://api.aylien.com/api/v1/classify-taxonomy/iptc-subjectcode?language=en&input=https%3A%2F%2Fwww.nytimes.com%2F2019%2F11%2F29%2Fopinion%2Fsunday%2Fandrew-johnson-donald-trump.html&taxonomy=iptc-subjectcode&url=https%3A%2F%2Fwww.nytimes.com%2F2019%2F11%2F29%2Fopinion%2Fsunday%2Fandrew-johnson-donald-trump.html&
    }, function(error, response) {
      if (error === null) {
        console.log(response);
        res.send(response);
      } else {
        console.log('Alyen ERROR: ' + error);
        res.send('error! Alyen!');
      }
    });
  })
  .get('/sentiment', (req, res) => {
    fetchDandilion(req.query.nurl).then(results => { res.send(results) });
  })
  .get('/', async (req, res) => {
    try {
      // putting this back to fetching locations from the db. Although no functionality 
      // is associated with them yet.
      
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM location');
      const results = {
        'results': (result) ? result.rows : null
      };
      console.log(results);
      res.render('pages/console', results);
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })

  .get('/times', (req, res) => res.send(showTimes()))
  .post('/calc', (req, res) => {
    var total = calculateRate(req.body.type, req.body.weight);
    res.render('pages/getRate', { title: "Postage Calculator", content: "CS313 Week10 Prove: Node, Express, EJS, and You", total: total, error: '' });
  })
  // redirecting everything to console
  .get('*', (req, res) => {
    // var url_parts = url.parse(req.url).pathname;
    // console.log(url_parts);
    // console.log(url_parts.pathname);
    console.log('request for: ' + url.parse(req.url).pathname);
    res.redirect('/');
  })
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

// functions
//NYTimes
// I hate how I've had to async AND await this function. I didn't think that was needed with
// promises.
async function nyTimesMostViewed() {
  var titles = '';
  const response = await fetch('https://api.nytimes.com/svc/mostpopular/v2/viewed/1.json?api-key=' + nytapi);
  if (response.status >= 400) {
    throw new Error("Bad response from server");
  }
  const data = await response.json();
  titles = data.results.map(result => {
    return [result.title, result.url];
  }).slice(0,5);
  console.log(titles);
  return JSON.stringify(titles);
}

//newsApi for Fox
// should make this modular
// this is now depricated for fetchNewsAPI(APIURL)
async function newsApiPopularFox() {
  var titles = '';
  var links = '';
  //console.log(newsapi.API_KEY);
  const response = await fetch('https://newsapi.org/v2/everything?domains=foxnews.com&pageSize=5&apiKey=' + process.env.API_KEY);
  if (response.status >= 400) {
    throw new Error("Bad response from server");
  }
  const data = await response.json();
  titles = data.articles.map(result => {
    return [result.title, result.url];
  });
  // links = data.articles.map((result, index, array) => {
  //   return result.url;
  // })
  console.log(titles);
  console.log(JSON.stringify(titles));
  // return titles;
  return JSON.stringify(titles);
}

async function fetchDandilion(nurl) {
  var fetchStr = 'https://api.dandelion.eu/datatxt/sent/v1/?lang=en&url=' + nurl + '&token=' + dandAPI;
  const results = await fetch(fetchStr);
  if (results.status >= 400) {
    throw new Error("Bad response from server");
  }
  const data = await results.json();

  return JSON.stringify(data);
}
// the idea is to take newsApi and feed it a domain to plug into the API call.
async function fetchNewsApi(apiUrl) {
  var titles = '';
  //console.log(newsapi.API_KEY);
  const response = await fetch(NEWS_URLS[apiUrl][1]);
  if (response.status >= 400) {
    throw new Error("Bad response from server");
  }
  const data = await response.json();
  titles = data.articles.map(result => {
    return [result.title, result.url];
  });
  console.log(titles);
  console.log(JSON.stringify(titles));
  return JSON.stringify(titles);
}



//newsApi returns top headlines
function newsApiTop10() {
  newsapi.v2.topHeadlines({
    q: 'trump',
    category: 'politics',
    language: 'en',
    country: 'us'
  }).then(response => {
    var newsjson = JSON.stringify(response);
    console.log(newsjson);
    console.log('************* now parsed:')
    console.log(JSON.parse(newsjson));
    return JSON.parse(newsjson);
    //return response;
    /*
      {
        status: "ok",
        articles: [...]
      }
    */
  });
  // return response;
}

showTimes = () => {
  let result = '';
  const times = process.env.TIMES || 5;
  for (i = 0; i < times; i++) {
    result += i + ' ';
  }
  return result;
}

calculateRate = (type, weight) => {
  var base = 0;
  var total = 0;
  console.log(type + ', ' + weight);
  switch (type) {
    case 'S':
      base = .55;
      total = (base + (.15 * (weight > 3 ? 3 : Math.trunc(weight) - 1)));
      break;
    case 'M':
      base = .50;
      total = (base + (.15 * (weight > 3 ? 3 : Math.trunc(weight) - 1)));
      break;
    case 'F':
      base = 1;
      total = (base + (.15 * (weight > 13 ? 13 : Math.trunc(weight) - 1)));
      break;
    case '1':
      // I don't want to do a nested switch. To make this meaningful
      // I'm going to play around with the USPS API.
      //total = 3.66;
      // need to make this wait?
      total = uspsGetRate(weight);
      total = total == NaN ? 3.66 : total;
      console.log(total);
      // arg!
      total = 3.66;
      break;
  }

  return (total.toFixed(2));
}

// still playing around with this
// have to make it wait I think.
async function uspsGetRate(weight) {
  usps.rateCalculator.rate(
    { // build a USPS package object, passing in weight
      // ran out of time, was going to replace the zip's with actual
      // form input. Arg. As it is, I need to pull out the rate from the json.
      // not sure how to do that in Node. Will need to investigate more. =()
      revision: '2',
      package: [
        {
          service: 'FIRST CLASS',
          firstClassMailType: 'LETTER',
          zipOrigination: '89117',
          zipDestination: '83460',
          pounds: '0',
          ounces: weight,
          size: 'REGULAR',
          machinable: true
        }
      ]
    }, function (error, response) {
      if (error) {
        console.log(error);
        return Number.parseFloat('0');
      } else {
        console.log(JSON.stringify(response));
        // need to dip into the response body and pull out the rate. ><
        //return JSON.stringify(response);
        return Number.parseFloat('3.66');
      }
    }
  );
}