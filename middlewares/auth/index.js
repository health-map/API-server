const basicAuth = require('basic-auth');
const Auth = require('./../../models/auth');

module.exports = (request, response, next)=>{
  function unauthorized(response) {
    response.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    response.status(401).json({ code: 'AU', message: 'Unauthenticated' });
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
    username: user.name,
    password: user.pass
  }

  console.log('authObj:',authObj)
  Auth.verify(authObj, (error, verifiedData)=>{

      if(error){
        console.log("redis not auth ",error)
        return unauthorized(response);
      }

      request.auth = Object.assign({
        username: user.name,
        password: user.pass
      }, verifiedData )

      next();
  })

}
