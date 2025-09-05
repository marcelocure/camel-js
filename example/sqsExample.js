import camel from '../src/index.js';

// Create a reusable SQS connection
camel.createSQSConnection('myAWSConnection', {
    region: 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    maxMessages: 5,
    waitTimeSeconds: 10,
    visibilityTimeoutSeconds: 30,
    pollingInterval: 2000
});

// Example SQS-triggered route using connection name
camel
    .init('sqsProcessor')
    .fromSQS('myAWSConnection', {
        queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue'
    })
    .to(exchange => {
        console.log('Processing SQS message:', exchange);
        
        // Process the message
        return {
            ...exchange,
            processed: true,
            processedAt: new Date(),
            processor: 'sqsProcessor'
        };
    })
    .end();

// Another route using the same connection but different queue
camel
    .init('sqsProcessor2')
    .fromSQS('myAWSConnection', {
        queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/another-queue'
    })
    .to(exchange => {
        console.log('Processing SQS message from another queue:', exchange);
        return { ...exchange, processed: true, processor: 'sqsProcessor2' };
    })
    .end();

console.log('SQS polling started. Routes will be triggered by SQS messages.');
console.log('Make sure to set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
