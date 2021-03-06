const Express = require('express');
const router = new Express.Router();
//TODO: Pending to add a schema validator to validate the format that the data is sent.
const inspector = require('schema-inspector');
const Geogroup = require('../models/geogroup');
const authAPI = require('../middlewares/auth');
const langMiddleware = require('../middlewares/lang');


router.get('/', authAPI, langMiddleware, (req, res) => {

    const {
        q,
        cityId
    } = req.query;

    const { id: createdBy, privacy_level: privacyLevel } = req.auth;  

    const options = {
        privacyLevel,
        createdBy,
        q,
        cityId
    }

    Geogroup.getGeogroups(options, (error, result) => {
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


router.post('/', authAPI, langMiddleware, (req, res) => {

    const  { 
        geogroup
    } = req.body;
    
    const { id: createdBy, privacy_level: privacyLevel } = req.auth;  

    const options = {
        geogroup,
        privacyLevel,
        createdBy
    }

    Geogroup.createGeogroup(options,  (error, result) => {
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


module.exports = router