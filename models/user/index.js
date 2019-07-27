const postg = require('../../db/postgre');
const auth = require('./../auth');
const md5 = require('md5');
const redis = require('./../db/redis');
class User{

    static login(options, cb) {
        const {
            email,
            password
        }
        //TODO the query need to check it with the filters.
        const query = `SELECT * FROM user WHERE email=$1`

        postg.querySlave(query, [email],(error, users)=>{
            if(error){
                console.log('ERROR:',error);
                return cb({
                    statusCode: 500,
                    code: 'UE',
                    message: 'Unknow error'
                });
            }

            if(!user.length){
                console.log('ERROR NOT FOUND WITH EMAIL:',email);
                return cb({
                    statusCode: 404,
                    code: 'NF',
                    message: `Not found user with email: ${email}`
                });
            }

            const userPivot = users[0];

            if(!(user.password === password || user.password === md5(password))){
                console.log('INCORRECT PASSWORD:',email);
                return cb({
                    statusCode: 412,
                    code: 'PF',
                    message: `Incorrect password`
                });
            }

            auth.saveUser(userPivot, (error)=>{
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