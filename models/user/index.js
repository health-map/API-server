const postg = require('../../db/postgre');
const auth = require('./../auth');
const md5 = require('md5');
const redis = require('./../../db/redis');
class User{

    static login(options, cb) {
        const {
            email,
            password
        } = options;
        //TODO the query need to check it with the filters.
        const query = `SELECT * FROM healthmap.user WHERE email='${email}'`

        postg.querySlave(query, (error, results)=>{
            if(error){
                console.log('ERROR:',error);
                return cb({
                    statusCode: 500,
                    code: 'UE',
                    message: 'Unknow error'
                });
            }
            const users = results.rows;
            console.log('USERS:',users)

            if(!users.length){
                console.log('ERROR NOT FOUND WITH EMAIL:',email);
                return cb({
                    statusCode: 404,
                    code: 'NF',
                    message: `Not found user with email: ${email}`
                });
            }

            const user = users[0];


            if(!(user.password === password || user.password === md5(password))){
                console.log('INCORRECT PASSWORD:',email);
                console.log('INCORRECT PASSWORD:',password);
                return cb({
                    statusCode: 412,
                    code: 'PF',
                    message: `Incorrect password`
                });
            }

            auth.saveUser(user, (error)=>{
                if(error){
                     return cb(error);
                }
                cb(null, {
                    statusCode: 200,
                    code: 'OK',
                    message: 'Login Successfully',
                    data: { users }
                })
            })
        });
        
    }

}
module.exports = User;