const redis = require('redis')
const { host, port, password } = require('./config')

let connection

module.exports = {
  connect: () => {
  	if (!connection) {
      console.log("connection ",password)
  		connection = redis.createClient(port, host, { password })
      if(password){connection.auth(password)}
  	}
  	return connection
  }
}
