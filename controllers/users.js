const Express = require('express');
const router = new Express.Router();
//TODO: Pending to add a schema validator to validate the format that the data is sent.
const inspector = require('schema-inspector');
const User = require('../models/user');
const authAPI = require('../middlewares/auth');
const langMiddleware = require('../middlewares/lang');


router.post('/login', (req, res) => {  

    const { 
        email,
        password
    } = req.body;

    const options = {
        email,
        password
    }

    User.login(options, (error, result) => {
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