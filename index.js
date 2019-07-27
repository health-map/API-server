const cluster = require('cluster');
if(cluster.isMaster) {
    const numWorkers = (process.env.SERVER_ENV === "production") ?
      require('os').cpus().length :
      1;

    console.log('Master cluster setting up ' + numWorkers + ' workers...')

    for(let i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    cluster.on('online', (worker)=>{
        console.log('Worker ' + worker.process.pid + ' is online')
    })

    cluster.on('exit', (worker, code, signal)=>{
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal)
        console.log('Starting a new worker')
        cluster.fork()
    })

}else{
    const express = require('express')
    , http = require('http')
    , path = require('path')
    , fs = require('fs')
    , expressLayouts = require('express-ejs-layouts')
    , engine = require('ejs-locals')
    , bunyan = require('bunyan')
    , bformat = require('bunyan-format')
    , multipart = require('connect-multiparty')
    , multipartMiddleware = multipart();

    let app = express();

    let debug = require("express-debug");

    let cookieParser = require('cookie-parser');
    app.use(cookieParser());

    let session = require('express-session');
    let RedisStore = require('connect-redis')(session);

    app.use(session({
        store: new RedisStore({
          port: process.env.REDIS_PORT || process.env.REDIS_PORT_6379_TCP_PORT || 6379,
          host: process.env.REDIS_HOST || process.env.REDIS_PORT_6379_TCP_ADDR || "localhost",
          password: process.env.REDIS_PASSWORD || undefined,
        }),
        secret: 'healthmap'
    }));

    let bodyParser = require('body-parser');
    app.use(bodyParser.urlencoded({
        extended: true,
        parameterLimit: 50000,
        limit: 1024 * 1024 * 50
    }));
    app.use(bodyParser.text());
    app.use(bodyParser.json());

    app.use(function(error, req, res, next) {
        console.error(error.stack);
        if(error){
          return res.status(400).send('Malformat json');
        }
        next();

    });

    // language
    const I18n = require('i18n-2');

    let i18n = new (I18n)({
        locales: ['en', 'es']
    });

    app.engine('ejs', engine);

    app.set('port', process.env.SERVER_PORT || 8020);

    app.use(expressLayouts);


    // Attach the i18n property to the express request object
    // And attach helper methods for use in templates
    I18n.expressBind(app, {
        // setup some locales - other locales default to en silently
        locales: ['en', 'es'],
        defaultLocale: 'es',
        // change the cookie name from 'lang' to 'locale'
        cookieName: 'locale'
    });


    /* this needs to change with cors*/
    const allowCrossDomain = function(req, res, next) {

        res.setHeader('Access-Control-Allow-Origin','*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader("Access-Control-Allow-Headers", " Authorization, X-Requested-With, Access-Control-Allow-Origin, X-HTTP-Method-Override, Content-Type, Accept");
    
        if(req.method.toUpperCase() === "OPTIONS")
        {
            console.log("Getting OPTIONS");
            return res.send(204);
        }
        next();
    }

    app.use(allowCrossDomain);
    app.use(express.static(path.join(__dirname, 'public')));


    app.get('/ping', function(req, res){
        res.contentType('application/json');
        return res.json({ ping:"PONG" });
    });

    function redirectSecure(req, res, next) {
        if (req.headers['x-forwarded-proto'] == 'https') {
            return next();
        } else {
            res.redirect('https://' + req.headers.host + req.path);
        }
    }


    if( process.env.SERVER_ENV==="production" ){
        app.use(redirectSecure);
    }

    //Endpoints
    app.use('/jobs',require('./controllers/jobs'));
    app.use('/incidences',require('./controllers/incidences'));
    app.use('/geofences',require('./controllers/geofences'));
    app.use('/geogroups',require('./controllers/geogroups'));
    app.use('/diseases',require('./controllers/diseases'));
    app.use('/institutions',require('./controllers/institutions'));
    app.use('/users',require('./controllers/users'));
    app.use('/age',require('./controllers/ages'));


    // Handle 404
    app.use(function(req, res) {
        res.status(404);
        return res.render('notfound', { layout: 'layouts/emptyLayout' });// not found
    });

    http.createServer(app).listen(app.get('port'), function(){
        console.log(`Express server listening on port ${app.get('port')} with the worker ${process.pid}`);
    });
  
}