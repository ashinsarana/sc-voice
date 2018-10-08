#!/usr/bin/env node

const path = require("path");
const compression = require("compression");
const express = require('express');
const app = module.exports = express();
const {
    logger,
    RestBundle,
    RbServer,
} = require('rest-bundle');
const {
    ScvRest,
    SuttaCentralApi,
} = require('../index');

global.__appdir = path.dirname(__dirname);
RbServer.logDefault();

app.use(compression());

// ensure argv is actually for script instead of mocha
var argv = process.argv[1].match(__filename) && process.argv || [];
argv.filter(a => a==='--log-debug').length && (logger.level = 'debug');

// set up application
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", 
        "X-Requested-With, Content-Type, Access-Control-Allow-Headers");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS, PUT, POST");
    next();
});
app.use("/", express.static(path.join(__dirname, "../public")));
app.use("/scv/", express.static(path.join(__dirname, "../dist")));
app.use("/scv/js", express.static(path.join(__dirname, "../dist/js")));
app.use("/scv/css", express.static(path.join(__dirname, "../dist/css")));
app.use("/scv/sounds", express.static(path.join(__dirname, "../local/sounds")));
(async function() {
    try {
        var suttaCentralApi = await new SuttaCentralApi().initialize();
        var rbServer =  app.locals.rbServer = new RbServer();

        // create RestBundles
        var restBundles = app.locals.restBundles = [];
        var opts = {
            suttaCentralApi,
        };
        //opts = undefined;
        var scvRest = new ScvRest(opts);
        await scvRest.initialize();
        restBundles.push(scvRest);

        // create http server and web socket
        var ports = [80, 8081].concat(new Array(100).fill(3000).map((p,i)=>p+i));
        rbServer.listen(app, restBundles, ports); 
        await rbServer.initialize();
    } catch(e) {
        logger.error(e.stack);
        throw e;
    }
})();