/*

Auth will hanlde many of the authentication methods that we use in
different APIS.

So far we have
- Api keys
- Passwordless
- JWT
*/

const redis = require('./../db/redis');

class Auth {

  /*
    Usage:
    authObj = {username, password}
  */
  static verify(authObj, cb) {

    const apiKey = `apikeys:id:${authObj.username}`;
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
        if(!resp){
          return cb(new Error(`Not found the key`))
        }

        if(result.api_token !== authObj.password){
          return cb(new Error("Wrong secret key"));
        }

        cb(null, resp);
      });
  }
}


module.exports = Auth;
