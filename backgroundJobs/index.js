const kue = require('kue');
const cluster = require('cluster');
const fs = require('fs');
const Upload = require('./libs/upload');

if(cluster.isMaster) {
    const numWorkers = (process.env.SERVER_ENV === "production") ?
      require('os').cpus().length :
      1;

    console.log('Master cluster setting up ' + numWorkers + ' workers...')

    for(let i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    cluster.on('online', (worker)=>{
        console.log('Worker ' + worker.process.pid + ' is online')
    })

    cluster.on('exit', (worker, code, signal)=>{
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal)
        console.log('Starting a new worker')
        cluster.fork()
    })

}else{

    const Curation = require('./models/curation');
    const Incidences = require('./../models/incidence');
    
    const queue = kue.createQueue({
        redis: {
          port: process.env.JOB_QUEUE_REDIS_PORT || 6379,
          host: process.env.JOB_QUEUE_REDIS_HOST || 'localhost',
          auth: process.env.JOB_QUEUE_REDIS_PASSWORD
        }
    });

    
    queue.process('DataProcess.curation', 5, (job, done) => {

        const domain = require('domain').create();

        domain.on('error', (jobError) => {
            console.log(jobError);
            done(jobError);
        });

        domain.run(() => {
            const data =
            Object.assign(
                { data: job.data },
                { jobId: job.id }
            );

            job.progress(0, 100, {status: 'starting'});

            Curation.process(job.data, 1, job.progress, (error, results)=>{
                if(error){
                    return done(error);
                }
                done(null, results);
            })
            
        });
    });


    queue.process('DataProcess.upload', 5, (job, done) => {

        const domain = require('domain').create();

        domain.on('error', (jobError) => {
            console.log(jobError);
            done(jobError);
        });

        domain.run(() => {
            job.progress(0, 100, {status: 'starting'});

            Incidences.getLoaderIncidences(job.data, (error, results)=>{
                if(error){
                    return done(error);
                }

                if(!results){
                    done(null, []);
                }

                const {
                    data: { incidences }
                } = results

                console.log('RESULTS:',incidences)
                let data = JSON.stringify(incidences);
                fs.writeFileSync('results.json', data);

                Upload.run((error)=>{
                    if(error){
                        return done(error);
                    }
                    done(null, incidences);
                }); 
            })
            
        });
    });
}