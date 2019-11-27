const express = require('express');
const path = require('path');
const url = require('url');
const NewsAPI = require('newsapi');
var Promise = require('promise/lib/es6-extensions');
const fetch = require('isomorphic-fetch');

// parsing env variables
require('dotenv').config();
const PORT = process.env.PORT || 5000;
const newsapi = new NewsAPI(process.env.API_KEY);
const nytapi = process.env.NYT_API;

// PG database
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

// these should go in different file. for now though...
// darn js's lack of associative arrays!
const NEWS_URLS = [
  ['google-news', 'https://newsapi.org/v2/top-headlines?country=us&pageSize=5&apiKey=' + process.env.API_KEY],
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
  
  // {
  //   //results = await nyTimesMostViewed();
  //   res.send(await nyTimesMostViewed());
  //   //res.send(results);
  // })
  .get('/', (req, res) => {
    // rewriting this. Going to do it with promises. There are two peices of information that we want:
    // 1) the results from locations table (putting this on hold)
    // 2) the results from NYTimes
    // Set up the database first. Only let the connect() await. The others no.
    //const client = await pool.connect();
    // the query result will be turned into a promise.

    // the NYTimes
    try {
      fetch('https://api.nytimes.com/svc/mostpopular/v2/viewed/1.json?api-key=' + nytapi)
        .then((response) => {
          if (response.status >= 400) {
            throw new Error("Bad response from server");
          }
          // good responses will fall through
          return response.json();
        })
        .then((data) => {
          const titles = data.results.map(result => { return result.title; }).slice(0, 5);
          console.log(titles)
          res.render('pages/console', { titles: (titles) ? titles : ' ' });
          return titles;
        }, (data) => { throw new Error("Rejected" + toString(data)) }).catch((error) => { console.log(error); throw error; });
      //.then(results => { res.render('pages/console', results)});
      //console.log(titles)
      //.then(results => { res.render('pages/console', results) });
      //client.release();
      // res.render('pages/console');
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })
  /*
  .get('/', (req, res) => {
    try {
      // var news =  new Promise((fulfill, reject) => { return newsApiTop10(req, res) }, (err) => { console.log(err) });
      //var news = await newsApiTop10(req, res);
      //console.log(news);
      
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM location');
      const results = {
        'results': (result) ? result.rows : null
      };
      console.log(results);
      newsApiTop10().then(res.render('pages/console', results)).catch;
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })*/
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