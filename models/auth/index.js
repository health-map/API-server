/*

Auth will hanlde many of the authentication methods that we use in
different APIS.

So far we have
- Api keys
- Passwordless
- JWT
*/

const redis = require('./../db/redis')
const crypto = require('crypto');

const base58 = require('bs58');

class Auth {

  /*
    Usage:
    authObj = {username, password}
  */
  static verify(authObj, cb) {
    redis.connect().hgetall(`apikeys:id:${authObj.username}`, function (err, resp) {

      /* resp.
      "api_token"
      "api_id"
      "company_short"
      "company_id"
      "type" // check for undefined / legacy support
      */
        if(err || !resp){
          console.log("resp ", resp)
          return cb(err)
        }
        console.log('resp.api_token:',resp.api_token)
        console.log('authObj.password:',authObj.password)
        if(resp.api_token!=authObj.password){
          return cb("Wrong secret key")
        }

        cb(null, resp);
      });
  }

// TODO:  deprecate 2 functions below
  static verifyObject(authObj, cb){
    if(typeof authObj === 'object'){
      Auth.verify(authObj, cb);
    }
    else{
      Auth.verifyApiId(authObj, cb);
    }
  }

  static verifyApiId(apiId, cb) {
    redis.connect().hgetall(`apikeys:id:${apiId}`, function (err, resp) {

      /* resp.
      "api_token"
      "api_id"
      "company_short"
      "company_id"*/
        if(err || !resp){
          console.log("resp ", resp)
          return cb(err)
        }

        cb(null, resp);
      });
  }


  static addApiKeys({companyId,companyType, companyUniqueName},callback){

    // var apiKeysArgs = {
    //   api_id: _company.api_id,
    //   api_token : localdb.token() ,
    //   company_short: generateShortName(_company.name),
    //   company_id: _company.id
    // };

  //   var multi = redis.multi();
  //
  // multi.set("apikey:"+params.api_id,params.api_token);
  // multi.hmset("apikeys:company:"+params.company_id,params);
  // multi.hmset("apikeys:id:"+params.api_id,params);

  }

}


module.exports = Auth;
