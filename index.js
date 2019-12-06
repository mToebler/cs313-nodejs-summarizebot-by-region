const express = require('express');
const path = require('path');
const url = require('url');
const NewsAPI = require('newsapi');
const googleTrends = require('google-trends-api');
var Promise = require('promise/lib/es6-extensions');
const fetch = require('isomorphic-fetch');
var AYLIENTextAPI = require('aylien_textapi');
const { NEWS_URLS, GOOGLE_NEWS, FOX_NEWS } = require('./middleware/constants');

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
    getNyTimesMostViewed(req.query.q).then(results => { res.send(results) });
  })
  .get('/fox', (req, res) => {
    //getNewsApiPopularFox().then(results => { res.send(results) });
    fetchNewsApi(FOX_NEWS, req.query.q).then(results => { res.send(results) });
  })
  .get('/googlenews', (req, res) => {
    fetchNewsApi(GOOGLE_NEWS, req.query.q).then(results => { res.send(results) });
  })
  .get('/aylien', (req, res) => {
    textapi.sentiment({ 'mode': 'document', 'url': req.query.nurl }, (error, response) => {
      if (error === null) {
        console.log(response);
        //var result = JSON.parse(response);
        var result = JSON.stringify(response);
        console.log(result);
        res.send(result);
      } else {
        console.log('Aylien error: ' + error);
        throw error('Aylien error: ' + error);
      }

    });

  })
  .get('/sentiment', (req, res) => {
    fetchDandilion(req.query.nurl).then(results => { res.send(results) });
  })
  .get('/q', (req, res) => {
    queryAllSources(req.query.q).then(results => { console.log('qAllSrces: returning' + results); res.send(results); });
  })
  //getInterestOver24hours sends response.
  .get('/interest', (req, res) => { getInterestOver24hours(req, res) })
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

// named functions

// NYTimes
async function getNyTimesMostViewed(token) {
  //Elasticsearch, so the filter query uses standard Lucene syntax. 
  var urlStr = '';
  if (token === undefined) {
    urlStr = 'https://api.nytimes.com/svc/mostpopular/v2/viewed/1.json?api-key=' + nytapi;
  } else {
    token = cleanTokenize(token);
    urlStr = 'https://api.nytimes.com/svc/search/v2/articlesearch.json?q=' + token + '&page=0&sort=newest&api-key=' + nytapi;
  }
  var titles = '';
  const response = await fetch(urlStr);
  if (response.status >= 400) {
    throw new Error("Bad response from server");
  }
  const data = await response.json();
  // token : data.response.docs.headline.main, response.docs.web_url
  if (token === undefined) {
    titles = data.results.map(result => {
      return [result.title, result.url]
    }).slice(0, 5);
  } else {
    try {
      console.log('getNyTimesMostViewed: data received - ' + JSON.stringify(data));
      titles = data.response.docs.map(docs => {
        return [docs.headline.main, docs.web_url];
      }).slice(0, 5);
    } catch (error) {
      console.log('getNyTimesMostViewed: Error ' + error);
      throwError(500, 'NYTimes error', error + '');
    }
  }
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
  console.log('getAylien: about to return data: ' + data);
  return results;
}

//fetchNewsApi
// the idea is to take newsApi and feed it a domain to plug into the API call.
async function fetchNewsApi(apiUrl, token) {
  var titles = '';
  var urlStr = '';
  if (token === undefined) {
    urlStr = NEWS_URLS[apiUrl][1];
  } else {
    token = cleanTokenize(token);
    urlStr = NEWS_URLS[apiUrl][1] + '&q=' + token;
    console.log('fetchNewsApi: token url is: ', urlStr);
  }
  //urlStr = NEWS_URLS[apiUrl][1] + '&q=' + token;
  const response = await fetch(urlStr);
  if (response.status >= 400) {
    throw new Error("Bad response from server");
  }
  const data = await response.json();
  titles = data.articles.map(result => {
    return [result.title, result.url];
  });
  console.log(titles);
  //console.log(JSON.stringify(titles));
  return JSON.stringify(titles);
}

async function queryAllSources(token) {
  const nyt = getNyTimesMostViewed(token);
  const google = fetchNewsApi(GOOGLE_NEWS, token);
  const fox = fetchNewsApi(FOX_NEWS, token);
  await nyt;
  await google;
  await fox;
  // may return a promise object but I don't think so.
  // returning an array of stringified json objects.
  return [nyt, google, fox];
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

// Using the limited Google Trends API to plot popularity
// I need to rework this from it's now testing stages.
// the interface expects something like :
// x: [1, 2, 3, 4, 5]
// y: [16, 18, 17, 18, 16]
// the x axis can simply be the index+1
// which means I need to grab the value at
// default.timelineData[i].formattedValue[0]
// while preserving the i+1?
function getInterestOver24hours(req, res) {
  var token = req.query.token;
  var yesterday = new Date(); // yeah, I'm not great with any kind of date ><
  yesterday = yesterday.setDate(yesterday.getDate() - 1);
  yesterday = getDateFormatted(yesterday);
  // google trends - super frustrating and squirlly.
  googleTrends.interestOverTime({
    keyword: token,
    startTime: yesterday,
    granularTimeResolution: true,
    timezone: new Date().getTimezoneOffset() / 60,
  }, (err, results) => {
    if (err) {
      console.log('oh no error!', err);
      throwError(505, 'GoogleTrends Error', err)
    } else {
      console.log(results);
      
      var data = JSON.parse(results);
       values = data.default.timelineData.map((value, index) => {
          return [value.formattedValue[0], value.time];
        })
      //}).then(values => {
        res.send(JSON.stringify(values));
      //}).catch(err => { throwError(err) });
    }
  });
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

function cleanTokenize(token, separator) {
  separator = separator || '+';
  if (!token === undefined) {
    token = token.replace(/[\W_]+/g, separator);
    token = token.endsWith('+') ? token.substr(-1) : token;
  }
  return token;
}

// date helper function to format dates as needd for GoogleTrends API 
// now using ES2015's default value for parameters
function getDateFormatted(formatMe = new Date(), sepr8r = '-') {
  // if undefined, use current date.
  // formatMe = formatMe || new Date();
  // sepr8r = sepr8r || '-';
  if (!(formatMe instanceof Date)) { formatMe = new Date(formatMe);}
  var dd = formatMe.getDate(); 
  var mm = formatMe.getMonth() + 1; //Jan is 0
  var yyyy = formatMe.getFullYear();
  if (dd < 10) {
    dd = '0' + dd;
  }
  if (mm < 10) {
    mm = '0' + mm;
  }
  // used to return this, but I needed dates. tight coupling much?
  var formatMe = yyyy + sepr8r + mm + sepr8r + dd;
  return new Date(formatMe);
}
