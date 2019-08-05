const pg = require ('pg');
const EventEmitter = require('events');
const util = require('util');
const postg = require('./db/postgre');
const redis = require('./db/redis');


const PREFIX_INCIDENCES = 'prefix_incidences'

// Build and instantiate our custom event emitter
function DbEventEmitter(){
  EventEmitter.call(this);
}


function cleanPatients(){
    const luaDelInfo = `return redis.call('del', unpack(redis.call('keys', ARGV[1])))`;
    redis.connect()
    .eval(luaDelInfo, 0, `${PREFIX_INCIDENCES}*`, (error)=>{
        if(error){
            return console.log('ERROR:',error)
        }
        return console.log('DONE!!')
    })
}

util.inherits(DbEventEmitter, EventEmitter);
var dbEventEmitter = new DbEventEmitter;

// Define the event handlers for each channel name
dbEventEmitter.on('new_patient', (msg) => {
  // Custom logic for reacting to the event e.g. firing a webhook, writing a log entry etc
  console.log('New patient received: ' + msg.id);
  //Calling to clean the data cached.
  cleanPatients();
});

// Connect to Postgres (replace with your own connection string)
postg.getConnect((error, client)=>{
  if(error) {
    console.log('ERROR:',error);
    return;
  }

  // Listen for all pg_notify channel messages
  client.on('notification', function(msg) {
    let payload = JSON.parse(msg.payload);
    dbEventEmitter.emit(msg.channel, payload);
  });
  
  // Designate which channels we are listening on. Add additional channels with multiple lines.
  client.query('LISTEN new_patient');
});