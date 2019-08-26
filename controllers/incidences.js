const Express = require('express');
const router = new Express.Router();
//TODO: Pending to add a schema validator to validate the format that the data is sent.
const inspector = require('schema-inspector');
const Incidence = require('../models/incidence');
const Job = require('../models/job');
const authAPI = require('./../middlewares/auth');
const langMiddleware = require('./../middlewares/lang');


router.get('/', authAPI, langMiddleware, (req, res) => {

    const  { 
        ageRange,
        gender,
        cie10,
        categoryGroup,
        geoGroup = [],
        geoFences = [],
        institution,
        department,
        startDate,
        endDate,
        wheather
    } = req.query;
  

    const options = {
        ageRange,
        gender,
        cie10,
        categoryGroup,
        geoGroup: typeof(geoGroup) === 'string' ? geoGroup.split(',') : geoGroup,
        geoFences: typeof(geoFences) === 'string' ? geoFences.split(',') : geoFences,
        institution,
        department,
        startDate,
        endDate,
        wheather
    }

    console.log('RANGE:', options);

    Incidence.getLoaderIncidences(options,  (error, result) => {
        if(error){

            if(error.statusCode){
                return res.status(error.statusCode).json({
                    code: error.code,
                    message: `${req.i18n.__(error.message)}`
                });
            }

            return res.status(500).json({
                code: 'UE',
                message: `${req.i18n.__(error.message)}`
            });
            
        }
        res.status(result.statusCode).json({
            code: result.code,
            message: `${req.i18n.__(result.message)}`,
            data: result.data
        });
    });
});


router.get('/load', authAPI, langMiddleware, (req, res) => {

    const  { 
        ageRange,
        gender,
        cie10,
        categoryGroup,
        geoGroup = [],
        geoFences = [],
        institution,
        department,
        startDate,
        endDate,
        wheather
    } = req.query;
  

    const options = {
        ageRange,
        gender,
        cie10,
        categoryGroup,
        geoGroup: typeof(geoGroup) === 'string' ? geoGroup.split(',') : geoGroup,
        geoFences: typeof(geoFences) === 'string' ? geoFences.split(',') : geoFences,
        institution,
        department,
        startDate,
        endDate,
        wheather
    }

    const dataJob = {
        "type": "DataProcess.upload",
        "data": options,
        "options": {
            "attempts": 3,
            "priority": "normal",
            "backoff": {
                "type": "exponential"
            }
        }
    }
    
    Job.createBackgroundJob(dataJob,  (error, result) => {
        if(error){

            if(error.statusCode){
                return res.status(error.statusCode).json({
                    code: error.code,
                    message: `${req.i18n.__(error.message)}`
                });
            }

            return res.status(500).json({
                code: 'UE',
                message: `${req.i18n.__(error.message)}`
            });
            
        }
        res.status(result.statusCode).json({
            code: result.code,
            message: `${req.i18n.__(result.message)}`
        });
    });
});


module.exports = router