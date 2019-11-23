const express = require('express');
const path = require('path');
// parsing our database url
require('dotenv').config();
//var usps = require('usps-web-tools-node-sdk');
const PORT = process.env.PORT || 5000

// // USPS API configure
// usps.configure({ userID: '711BYUID0181' });

//PG database
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

// much of this is from the Heroku getting started Node template.
express()
  .use(express.static(path.join(__dirname, 'public')))
  // for parsing application/x-www-form-urlencoded
  .use(express.urlencoded({ extended: true }))
  // defining the views path. this is required for templates.
  .set('views', path.join(__dirname, 'views'))
  // setting view engine to ejs. If pug, then we'd just replace ejs with pug
  // this is also required for templates.
  .set('view engine', 'ejs')
  // and all these get paths are in the views/ directory
  //.get('/', (req, res) => res.render('pages/index'))
  .get('/', (req, res) => res.render('pages/console'))
  .get('/db', async (req, res) => {
    try {
      const client = await pool.connect()
      const result = await client.query('SELECT * FROM location');
      const results = { 'results': (result) ? result.rows : null };
      res.render('pages/db', results);
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })
  .get('/times', (req, res) => res.send(showTimes()))
  .post('/calc', (req, res) => {
    var total = calculateRate(req.body.type, req.body.weight);
    res.render('pages/getRate', { title: "Postage Calculator", content: "CS313 Week10 Prove: Node, Express, EJS, and You", total: total, error: ''});
  })
  .listen(PORT, () => console.log(`Listening on ${PORT}`));


// functions
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