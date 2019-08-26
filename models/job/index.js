const request = require('request');
const postg = require('../../db/postgre');
const redis = require('./../../db/redis');

class Job{

    static createBackgroundJob(data, cb) {
        if (!process.env.JOB_QUEUE_USERNAME || !process.env.JOB_QUEUE_PASSWORD || !process.env.JOB_QUEUE_HOST) {
            console.log('Missing config for background jobs');
            return cb({
                statusCode: 500,
                code: 'UE',
                message: 'Missing config for background jobs'
            });
        }
    
        console.log('PAYLOAD INCOMING TO CREATE BACKGROUND JOB', data);

        // TODO: we need to consider TTL also
        const payload = {
            type: data.type || 'DataProcess.curation' ,
            data,
            options: {
                searchKeys: ['userId'],
                attempts: 1,
                priority: 'normal',
                backoff: {
                    type: 'exponential'
                }
            }
        };
    
        console.log('PAYLOAD OUTGOING FROM CREATE BACKGROUND JOB', JSON.stringify(payload));

        return request.post(
            `http://${process.env.JOB_QUEUE_USERNAME}:${process.env.JOB_QUEUE_PASSWORD}@${process.env.JOB_QUEUE_HOST}/api/job`, 
            { json: payload },
            (error, resp, job) => {
                if (error || resp.statusCode != 200) {
                    console.log(error);
                    console.log(resp);
                    return cb({ 
                        statusCode: 500, 
                        code: 'UE', 
                        message: 'Problem creating the request' 
                    });
                }
    
                cb({ 
                    statusCode: 200, 
                    code: 'OK', 
                    message: `Job ${job.id} created successfully`
                });
            }
        );
    }

}
module.exports = Job;