/* things to do this week:
    --------------------------------
    - !!!!!!!!!!!!!!!!!!!!!!!!!!!! -
    - GoogleTrendsAPI Daily Trends -
    -  Integrate it into Analysis  -
    -      when first loaded       -
    - !!!!!!!!!!!!!!!!!!!!!!!!!!!! -
done--------------------------------
nproc- organize code into included module
done- use only the 6 highest rated related terms (if exist)
    - add media to article box?
done- use highest ranking related term for a graph on article load?
    - consider animation while waiting
npoc- error handling!!!
    - allowing the third source spot (Google) to be configured from a list?
*/
const express = require('express');
const path = require('path');
const url = require('url');
const NewsAPI = require('newsapi');
const googleTrends = require('google-trends-api');
var Promise = require('promise/lib/es6-extensions');
const fetch = require('isomorphic-fetch');
var AYLIENTextAPI = require('aylien_textapi');
const { SEARCH_NEWS_URLS, NEWS_URLS, GOOGLE_NEWS,
  FOX_NEWS, DANDE_ENTITY_ENDPOINT } = require('./middleware/constants');

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
    getNyTimesMostViewed(req.query.q).then(results => { res.send(results) }).catch(error => {
      console.error('NYTimes Error', error);
      res.send('NYTimes Error' + error)
    });
  })
  .get('/fox', (req, res) => {
    fetchNewsApi(FOX_NEWS, req.query.q).then(results => { res.send(results) });
  })
  .get('/googlenews', (req, res) => {
    fetchNewsApi(GOOGLE_NEWS, req.query.q).then(results => { res.send(results) });
  })
  .get('/aylien', (req, res) => {
    textapi.sentiment({ 'mode': 'document', 'url': encodeURI(req.query.nurl) }, (error, response) => {
      if (error === null) {
        console.log(response);        
        var result = JSON.stringify(response);
        console.log(result);
        res.send(result);
      } else {
        console.error(`Aylien error: ${error}`);
        // throw Error('Aylien error: ' + error);
        var sentiment = { "polarity": "Not analyzed", "polarity_confidence": "Problem in text" }
        console.error('Sending error sentiment (strfy): ' + JSON.stringify(sentiment));
        sentiment = JSON.stringify(sentiment);
        res.send(sentiment);
      }

    });

  })
  .get('/sentiment', (req, res) => {
    fetchDandilion(req.query.nurl).then(results => { res.send(results) });
  })
  .get('/related', (req, res) => { getRelatedEntities(req, res) })
  .get('/q', (req, res) => {
    queryAllSources(req.query.q).then(results => { console.log('qAllSrces: returning' + results); res.send(results); });
  })
  //getInterestOver24hours sends response.
  .get('/interest', (req, res) => { getInterestOver24hours(req, res) })
  //getTrends sends response.
  .get('/trends', (req, res) => {getTrends(req, res)})
  .get('/saveArticle', async (req, res) => {
    try {
      var nurl = req.query.nurl;
      var headline = req.query.headline;
      const client = await pool.connect();
      const result = await client.query("insert into articles (headline, uri) values('" + encodeURIComponent(headline) + "', '" + encodeURI(nurl) + "')");
      const results = {
        'results': (result) ? result.rows : null
      };
      console.log('/saveArticle results:', results);      
      client.release();
      res.send({ status: '200', newId: 'NULL' });
    } catch (err) {
      console.error('/saveArticle Error: ', err);
      res.send({ status: '505', error: err });
    }
  })
  .get('/removeArticle', async (req, res) => {
    try {
      var nurl = req.query.nurl;
      const client = await pool.connect();
      const result = await client.query("delete from articles where uri = '" + encodeURI(nurl) + "'");
      const results = {
        'results': (result) ? result.rows : null
      };
      console.log('/removeArticle results:', results);
      client.release();
      res.send({ status: '200', message: 'Deleted' });
    } catch (err) {
      console.error('/saveArticle Error: ', err);
      res.send({ status: '505', error: err });
    }
  })
  .get('/', async (req, res) => {
    try {
      // retrieving saved articles on load
      const client = await pool.connect();      
      const result = await client.query('SELECT * FROM articles WHERE saved = true');
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
  // redirecting everything else to console
  .get('*', (req, res) => {
    console.log('request for: ' + url.parse(req.url).pathname);
    res.redirect('/');
  })
  .listen(PORT, () => console.log(`Listening on ${PORT}`));


// NAMED FUNCTIONS
// ===============

// NYTimes returns most viewed articles in the last day
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

// Dandilion (Dandelion) is a limited free text analyzing API. It's results are 
// shakey, but they don't expire like Aylien and others ><
// this function requests a sentiment check for the provided URL.
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
      // new error handling API
      sendError(response, '', error);
    }
  });
  const data = await results.json();
  console.log('getAylien: about to return data: ' + data);
  return results;
}

//fetchNewsApi
// NewsApi is what was left after Google took a hatchet to their
// moghty Google News API which evidently had issues of silo'ing and was 
// open to manipulation. The features are limited and don't allow
// mixing location  & query/token. One of the few daggers that killed off
// the regional tracking plan.
// Feed a domain to plug into the API call.
async function fetchNewsApi(apiUrl, token) {
  var titles = '';
  var urlStr = '';
  if (token === undefined) {
    urlStr = NEWS_URLS[apiUrl][1];
  } else {
    token = encodeURIComponent(token);
    urlStr = SEARCH_NEWS_URLS[apiUrl][1] + '&q=' + token;
  }
  const response = await fetch(urlStr);
  if (response.status >= 400) {
    throw new Error("Bad response from server");
  }
  const data = await response.json();
  titles = data.articles.map(result => {
    return [result.title, result.url];
  });
  console.log(titles);
  return JSON.stringify(titles);
}

// Wrapper function. Queries the 3 main news sources
// using await in a manner that doesn't impede the other 
// API calls.
async function queryAllSources(token) {
  if (token) token = encodeURIComponent(token);
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

// Using the limited Google Trends API to plot popularity
// This has been reworked from it's testing stages to now
// use the timestamp associated with each score with
// plot.ly's graphing library to display and tick
// dates along the x-axis.
// the client side expects something like :
// x: [1575594220, 1575594230, 1575594240, 1575594254, 1575594269]
// y: [16, 18, 17, 18, 16]
// the x axis timestamps will be mulitplied by 1000 client side.
// which means for y I need to grab the value at
// default.timelineData[i].formattedValue[0]
// while preserving the timestamp.
function getInterestOver24hours(req, res) {
  //written without the use of async or await.
  var token = req.query.token;
  var yesterday = new Date(); // yeah, I'm not great with any kind of date ><
  yesterday = yesterday.setDate(yesterday.getDate() - 1);
  yesterday = getDateFormatted(yesterday);
  // google trends - frustrating and squirlly.
  googleTrends.interestOverTime({
    keyword: token,
    startTime: yesterday,
    granularTimeResolution: true,
    timezone: new Date().getTimezoneOffset() / 60,
  }, (err, results) => {
    if (err) {
      console.log('getInterestOver24hours Error: ', err);
      throwError(505, 'getInterestOver24hours Error', err)
    } else {
      //console.log(results);
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

// writing this new fangled arrow style.
getRelatedEntities = (req, res) => {
  // the idea is to query dandelion's entity extraction endpoint api
  // to pull out the topics involved. I'm using dandelion and not one 
  // of the others as it is free at 1000 requests per day and doesn't
  // expire.
  // get the newsUrl (nurl) from the request:
  var nurl = req.query.nurl;
  // query string:
  var fetchStr = DANDE_ENTITY_ENDPOINT + '&url=' + nurl + '&token=' + dandAPI;
  fetch(fetchStr).then(results => {
    return results.json();
  }).then(data => {
    console.log('getRelatedEntities results.json(): ', data);
    values = data.annotations.map(
      (value) => {
        // replacing uri with confidence score. 
        return [value.title, value.confidence]
      });
    res.send(JSON.stringify(values));
  }).catch(err => {
    console.log('getRelatedEntities Error: + ', err);
    throwError(505, err.name, err.message);
  });
}

// getTrends
// Retrieves the current trending searches on Google. Currently returning
// the token and the number of requests formatted for display, e.g., 100k, 50k, 20k
// [["Cougars vs Rebels", "200k"],["War on Christmas", "20k"]]
// written with callback. sends own response.
function getTrends(req, res) {
  var trendDate = req.query.trendDate === undefined ? new Date() : req.query.trendDate;
  trendDate = getDateFormatted(trendDate);
  console.log('getTrends: trendDate: ', trendDate);
  // quirky googletrends. 
  googleTrends.dailyTrends({
    trendDate: trendDate,
    geo: 'US',
  }, function (err, results) {
    if (err) {
      console.error(err);
      throwError(err);
    } else {
      //console.log(results);
      parsedResults = JSON.parse(results);
      trending = parsedResults.default.trendingSearchesDays[0].trendingSearches.map(result => {
        return [result.title.query, result.formattedTraffic]
      });
      console.log('getTrends: trending: ', trending);
      res.send(JSON.stringify(trending));
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
  if (!(formatMe instanceof Date)) { formatMe = new Date(formatMe); }
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

// DEPRICATED FUNCTIONS
// =====================
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
// deprecated for fetchNewsAPI(APIURL)
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

