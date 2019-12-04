const express = require('express');
const path = require('path');
const url = require('url');
const NewsAPI = require('newsapi');
var Promise = require('promise/lib/es6-extensions');
const fetch = require('isomorphic-fetch');
var AYLIENTextAPI = require('aylien_textapi');
const { NEWS_URLS, GOOGLE_NEWS, FOX_NEWS } = require('./middleware/constants');
console.log('vars are: ' + NEWS_URLS + '\n' + GOOGLE_NEWS + '\n' + FOX_NEWS);

// parsing env variables
// these consts should be in ALL_CAPS
require('dotenv').config();
const PORT = process.env.PORT || 5000;
const newsapi = new NewsAPI(process.env.API_KEY);
const nytapi = process.env.NYT_API;
const aylienAppId = process.env.AYLIEN_APP_ID;
const aylienAPI = process.env.AYLIEN_API;
const dandAPI = process.env.DAND_API;

// PG database
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

var textapi = new AYLIENTextAPI({
  application_id: aylienAppId,
  application_key: aylienAPI
});

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
    getNyTimesMostViewed().then(results => { res.send(results) });
  })
  .get('/fox', (req, res) => {
    //getNewsApiPopularFox().then(results => { res.send(results) });
    fetchNewsApi(FOX_NEWS).then(results => { res.send(results) });
  })
  .get('/googlenews', (req, res) => {
    fetchNewsApi(GOOGLE_NEWS).then(results => { res.send(results) });
  })
  .get('/aylien', (req, res) => {
    textapi.sentiment({ 'mode': 'document','url': req.query.nurl}, (error, response) => {
      if (error === null) {
        console.log(response);
        //var result = JSON.parse(response);
        var result = JSON.stringify(response);
        console.log(result);
        res.send(result);
      } else {
        console.log('aylien error: ' + error);
        throw error('Aylien error: ' + error);
      }
      
    });
    
  })
  // .get('/aylien', (req, res) => {
  //   //getAylien(req.query.nurl).then(results => { res.send(results) }).catch(error => { console.log('Aylien Error: ' + error);})
  //   getAylien(req.query.nurl)
  //     .then(results => {
  //       console.log('getAylien results from get call: ' + results);
  //       return results.json();
  //     })
  //     .then(results => {
  //       res.send(JSON.stringify(results))
  //     }).catch(results => { console.log('Aylien Error: ' + results); })
  // })
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
// NYTimes
async function getNyTimesMostViewed() {
  var titles = '';
  const response = await fetch('https://api.nytimes.com/svc/mostpopular/v2/viewed/1.json?api-key=' + nytapi);
  if (response.status >= 400) {
    throw new Error("Bad response from server");
  }
  const data = await response.json();
  titles = data.results.map(result => {
    return [result.title, result.url];
  }).slice(0, 5);
  console.log(titles);
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

//getAylien sentiment analysis.
// CAUTION, this is on a trial key. Need to catch promise error and deal.
// Using a callback rather than promise.
async function getAylien(nurl) {
  console.log('Aylien: nurl is: ' + nurl);
  //build & send the Aylien request object
  const results = await textapi.sentiment({
    'mode': 'document',
    'url': nurl,
  }, (error, response) => {
    if (error === null) {
      console.log('getAylien: inside error===null, got: ' + response);
      return response; //JSON.parse(response).stringify();
    } else {
      console.log('Aylien ERROR: ' + error);
      //throwError(code, errorType, errorMessage);
      // new error handling API
      sendError(response, '', error);
      //response.send('error! Aylien!');
    }
  });//.catch(error => { throwError('501' 'Aylien catch ERROR', error) });
  const data = await results.json();
  console.log('getAylien: about to return data: ');
  return results;
}

//fetchNewsApi
// the idea is to take newsApi and feed it a domain to plug into the API call.
async function fetchNewsApi(apiUrl) {
  console.log('vars are: ' + NEWS_URLS + '\n' + GOOGLE_NEWS + '\n' + FOX_NEWS);
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

//newsApi for Fox
// should make this modular
// this is now depricated for fetchNewsAPI(APIURL)
async function getNewsApiPopularFox() {
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

//newsApi returns top headlines for a query string if provided.
function getNewsApiPoliticalTop10(q) {
  newsapi.v2.topHeadlines({
    q: q == null ? '' : q,
    category: 'politics',
    language: 'en',
    country: 'us'
  }).then(response => {
    return response.json();
  })
  // find better structure.
  // this may be a promise object
  return response;
}

// ERROR HANDLING HELPER FUNCTIONS 
// rewriting everything to handle errors better
// by using then(success, error) 

// throwError function variable definition
// build an Error object then throw which stops exe chain.
// params:
//   code:      added property for server response code in 400|500 range
//   errorType: added custom error type, 'invalid request' 'not found' 'db error'
//   errorMsg:  longer description of error, 'Invalid query parameter' 'Article not found' 
throwError = (code, errorType, errorMessage) => {
  return error => {
    // create error if empty result
    if (!error) {
      error = new Error(errorMessage || 'Default Error');
    }
    // add custom fields
    error.code = code;
    error.errorType = errorType;
    // finally, return error obj and stop promise chain execution
    throw error;
  }
}
// to be used in lieu of nested try/catch blocks allowing for fine tuned 
// errors to be used with promises and asyncs alike
// inspired by article in codeburst.io
// params:
//   fn:   function represents logic in nested try/catch block, to
//         aid readability when calling THIS SHOULD BE PASSED IN AS
//         THE FUNCTION's COMPLIMENT (its opposite, i.e, !fn )
//   (see throwError for others)
// Ex: throwIf(fetchResult => !fetchResult, 400, 'invalid request', 'Invalid query parameter')
throwIf = (fn, code, errorType, errorMessage) => result => {
  // note the double function notation above for result. This is the same as
  // {return result => {...} }
  // to aid readability (otherwise a '!' would be here)
  if (fn(result)) {
    // from above. the '()' at end triggers the creation of a new Error object
    // from the thrown error returned by throwError
    return throwError(code, errorType, errorMessage)();
  }
  // result returned elsewise;
  return result;
}
// sends success at end of promise chain
sendSuccess = (res, message) => data => {
  res.status(200).json({ type: 'success', message, data });
}
// sends the thrown error caught in the actual catch() block
sendError = (res, status, message) => error => {
  res.status(status || error.status).json({
    type: 'error',
    message: message || error.message,
    error
  });
}

