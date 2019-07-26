const basicAuth = require('basic-auth');
const Auth = require('./../../models/auth');

function authAPI(request, response, next) {
  function unauthorized(response) {
    response.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    response.status(401).json({ code: 'AU', message: 'Unauthenticated'});
    return;
  }

  const user = basicAuth(request);
  console.log('USER:',user)
  if (user == null || user.name == null || user.pass == null ||
    user.name == undefined || user.pass == undefined ||
    `${user.name}` === `` || `${user.pass}` === ``) {
    unauthorized(response);
    return;
  }

  const authObj = {
    username:user.name,
    password:user.pass
  }
  //To to be to able to do a backtracking from the requester
  if(process.env.SERVER_ENV=="production"){
    newrelic.addCustomAttributes({'username': user.name});
  }

  console.log('authObj:',authObj)
  Auth.verify(authObj,(verifyError,verifyData)=>{

      if(verifyError){
        console.log("redis not auth ",verifyError)
        return unauthorized(response);
      }

      request.auth = Object.assign({
        username: user.name,
        password: user.pass
      },verifyData)

      next();
  })

}

module.exports = authAPI;
