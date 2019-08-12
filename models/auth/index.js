/*

Auth will hanlde many of the authentication methods that we use in
different APIS.

So far we have
- Api keys
- Passwordless
- JWT
*/

const redis = require('./../../db/redis');

class Auth {

  /*
    Usage:
    authObj = {username, password}
  */

  static saveUser(user, cb){
    const apiKey = `apikeys:api_id:${user.email}`;
    console.log('KEY:',apiKey)
    redis.connect()
    .hmset(apiKey, user, (error, result)=>{
      if(error){
        console.log('ERROR:',error);
        return cb(new Error(`Error saving credentials`))
      }
      cb(null);
    });
  }

  static verify(authObj, cb) {
    console.log('authObj', authObj);
    const apiKey = `apikeys:api_id:${authObj.username}`;

    console.log('apiKey:',apiKey)
    redis.connect()
    .hgetall(apiKey, (error, result)=>{

        /* resp.
          "api_token"
          "api_id"
          "user_id"
          "role_id" 
        */

        if(error){
          return cb(error);
        }
        if(!result){
          return cb(new Error(`Not found the key`))
        }

        if(result.password !== authObj.password){
          return cb(new Error("Wrong secret key"));
        }

        cb(null, result);
      });
  }
}


module.exports = Auth;
