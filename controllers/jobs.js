const Express = require('express');
const router = new Express.Router();
const inspector = require('schema-inspector');
const Job = require('../models/job');
const authAPI = require('./../middlewares/auth');