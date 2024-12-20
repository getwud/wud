const express = require('express');
const passport = require('passport');
const nocache = require('nocache');
const { output } = require('../prometheus');
const auth = require('./auth');

/**
 * Prometheus Metrics router.
 * @type {Router}
 */
const router = express.Router();

/**
 * Return Prometheus Metrics as String.
 * @param req
 * @param res
 */
async function outputMetrics(req, res) {
    res.status(200)
        .type('text')
        .send(await output());
}

/**
 * Init Router.
 * @returns {*}
 */
function init() {
    router.use(nocache());

    // Routes to protect after this line
    router.use(passport.authenticate(auth.getAllIds()));

    router.get('/', outputMetrics);
    return router;
}

module.exports = {
    init,
};
