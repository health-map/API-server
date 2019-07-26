
const host = process.env.POSTGRES_HOST
const port = process.env.POSTGRES_PORT
const user = process.env.POSTGRES_USER
const password = process.env.POSTGRES_PASS
const database = process.env.POSTGRES_DB

const slaveHost = process.env.POSTGRES_HOST
const slavePort = process.env.POSTGRES_PORT
const slaveUser = process.env.POSTGRES_USER
const slavePassword = process.env.POSTGRES_PASS
const slaveDatabase = process.env.POSTGRES_DB


const configurations = {
  master: {
    host, port, user, password, database
  },
  slaves: {
    slaveHost, slavePort, slaveUser, slavePassword, slaveDatabase
  }
}

module.exports = configurations;
