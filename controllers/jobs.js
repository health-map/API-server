const Express = require('express');
const router = new Express.Router();
//Code to upload csv files.
const fs = require('fs');
const csv = require("csvtojson");
const multipart = require('connect-multiparty')
    ,multipartMiddleware = multipart();
//TODO: Pending to add a schema validator to validate the format that the data is sent.
const Job = require('../models/job');
const authAPI = require('./../middlewares/auth');
const langMiddleware = require('./../middlewares/lang');

router.post('/data', authAPI, langMiddleware, (req, res) => {

    const  { data } = req.body;
  
    if(!data){
        return res.status(412).json({
            code: 'PF',
            message: 'Missing [data] param'
        });
    }

    Job.createBackgroundJob(data,  (error, result) => {
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


router.post('/data/csv', authAPI, langMiddleware, multipartMiddleware, (req, res) => {

    const csvData = req.files.source;

    if (typeof csvData === 'undefined' || csvData == null) {
        return res.sendStatus(412).json({ 
            code: 'PF',
            message: 'Missing [data] param'
        });
    }

    csv()
    .fromFile(csvData.path)
    .then((data)=>{
        Job.createBackgroundJob(data,  (error, result) => {
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
    }).catch((error)=>{

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
    }); 
});

module.exports = router