const Express = require('express');
const router = new Express.Router();
//TODO: Pending to add a schema validator to validate the format that the data is sent.
const Patient = require('../models/patient');
const authAPI = require('../middlewares/auth');
const langMiddleware = require('../middlewares/lang');


router.get('/', authAPI, langMiddleware, (req, res) => {

    const  { 
        ageRange,
        gender,
        cie10,
        institution,
        department,
        startDate,
        endDate
    } = req.query;
  

    const options = {
        ageRange,
        gender,
        cie10,
        institution,
        department,
        startDate,
        endDate
    }

    console.log('RANGE:', options);

    Patient.getPatientsPoints(options,  (error, result) => {
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
        age,
        cie10,
        ageType,
        registeredDate,
        institution,
        department,
        gender,
        etnia,
        latitude,
        longitude,
        cuarantine_status,
        integration_id
    } = req.body;
  

    const options = {
        age,
        cie10,
        ageType,
        registeredDate,
        institution,
        department,
        gender,
        etnia,
        latitude,
        longitude,
        cuarantine_status,
        integration_id
    }

    Patient.insertPatientPoint(options,  (error, result) => {
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
        res.status(200).json({
            code: 'OK',
            message: `PATIENT ADDED`
        });
    });
});


router.patch('/', authAPI, langMiddleware, (req, res) => {

    const  { 
        latitude,
        longitude,
        cuarantine_status,
        integration_id
    } = req.body;

    if (!integration_id){
        return res.status(412).json({
            code: 'UE',
            message: `Must send integration_id of the patient in your system`
        });
    }
  

    const options = {
        latitude,
        longitude,
        cuarantine_status,
        integration_id
    }

    Patient.editPatientPoint(options,  (error, result) => {
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
        res.status(200).json({
            code: 'OK',
            message: `PATIENT SUCCESSFULLY EDITED`
        });
    });
});


module.exports = router