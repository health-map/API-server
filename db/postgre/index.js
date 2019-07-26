const postg = require('pg-pool');
const { master, slave } = require('./config')

const masterPoolClusterConfiguration = new postg(Object.assign({}, master, {
  ssl: true,
  max: 20, // set pool max size to 20
  idleTimeoutMillis: 1000, // close idle clients after 1 second
  connectionTimeoutMillis: 1000, // return an error after 1 second if connection could not be established
}));


const slaveClusterConfiguration = new postg(Object.assign({}, slave, {
  ssl: true,
  max: 20, // set pool max size to 20
  idleTimeoutMillis: 1000, // close idle clients after 1 second
  connectionTimeoutMillis: 1000, // return an error after 1 second if connection could not be established
}));


const ServerName = {
  MASTER: masterPoolClusterConfiguration,
  SLAVE: slaveClusterConfiguration
}


function query(pattern, sql, values, callback) {
  let valuesIsAfunction = false
  if (typeof values === 'function') {
    valuesIsAfunction = true;
    callback = values;
  }

  pattern.connect((err, connection, done) => {
    done();
    if (error) {
      if(typeof connection !== "undefined"){
        connection.release(); //To prevent dummy connections
      }
      callback(error)
      return
    }

    if(valuesIsAfunction){
      return connection.query(sql, (error, results) => {
        callback(error, results);
      })
    }

    connection.query(sql, values, (error, results) => {
      callback(error, results);
    })
  })
}

postg.queryMaster = (sqlString, values, callback) => {
  console.log("QUERY MASTER:", sqlString);
  query(ServerName.MASTER, sqlString, values, callback);
}

postg.querySlave =(sqlString, values, callback) => {
  console.log("QUERY SLAVE:", sqlString);
  query(ServerName.SLAVE, sqlString, values, callback);
}


module.exports = mysql
