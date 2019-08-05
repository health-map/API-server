const pg = require ('pg');
const postg = require('pg-pool');
const { master, slave } = require('./config')


const masterConfiguration = Object.assign({}, master, {
  idleTimeoutMillis: 60000, // close idle clients after 1 second
  connectionTimeoutMillis: 60000, // return an error after 1 second if connection could not be established
});

const masterPoolClusterConfiguration = new postg(Object.assign({}, master, {
  ssl: false,
  max: 20, // set pool max size to 20
  idleTimeoutMillis: 60000, // close idle clients after 1 second
  connectionTimeoutMillis: 60000, // return an error after 1 second if connection could not be established
}));


const slaveClusterConfiguration = new postg(Object.assign({}, slave, {
  ssl: false,
  max: 20, 
  idleTimeoutMillis: 60000, 
  connectionTimeoutMillis: 60000, 
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

  pattern.connect((error, connection, done) => {
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


function getConnect(callback) {
  const URL = `postgres://${masterConfiguration.user}:${masterConfiguration.password}@${masterConfiguration.host}:${masterConfiguration.port}/${masterConfiguration.database}`
  pg.connect(URL, 
  (error, client)=>{
    if (error) {
      console.log('ERROR:',error);
      callback(error);
      return;
    }
    callback(null, client);
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

postg.getConnect = getConnect;



module.exports = postg
