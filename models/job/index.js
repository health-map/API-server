const request = require('request');

class Job{

    static createBackgroundJob(options, cb) {
        if (!process.env.JOB_QUEUE_USERNAME || !process.env.JOB_QUEUE_PASSWORD || !process.env.JOB_QUEUE_HOST) {
            console.log('Missing config for background jobs');
            return cb({
                statusCode: 500,
                code: 'UE',
                message: 'Missing config for background jobs'
            });
        }
    
        console.log('PAYLOAD INCOMING TO CREATE BACKGROUND JOB', options);

        // TODO: we need to consider TTL also
        const payload = {
            type: 'Routing.jsprit',
            data: {
                userId: `routing_uid_${userId}`,
                company,
                deliveries: points,
                deliveriesLength: points.length
            },
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