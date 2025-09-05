import assert from 'assert';

// Set test environment to prevent SQS polling
process.env.NODE_ENV = 'test';

// Mock AWS SDK before importing the main module
const mockSQS = {
    receiveMessage: () => ({
        promise: () => Promise.resolve({
            Messages: []
        })
    }),
    deleteMessage: () => ({
        promise: () => Promise.resolve({})
    })
};

// Create a mock AWS object
const mockAWS = {
    SQS: () => mockSQS
};

// Set the mock globally
global.AWS = mockAWS;

// Now import the routes module
import routes from '../src/index.js';

describe('SQS Integration Tests', () => {
    beforeEach(() => {
        // Clear routes before each test
        routes.getRoutes().length = 0;
    });

    afterEach(() => {
        // Stop any SQS polling that might have started
        routes.stopAllSQSPolling();
    });

    it('should create SQS connection configuration', () => {
        routes.createSQSConnection('testConnection', {
            region: 'us-west-2',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
            maxMessages: 5,
            waitTimeSeconds: 10,
            visibilityTimeoutSeconds: 30,
            pollingInterval: 2000
        });

        // Verify connection was stored by using it in fromSQS
        routes.init('sqsTestRoute')
        .fromSQS('testConnection', {
            queueUrl: 'https://sqs.us-west-2.amazonaws.com/123456789012/test-queue'
        })
        .to(exchange => exchange)
        .end()

        const route = routes.getRoutes().find(r => r.name === 'sqsTestRoute');
        assert(route.sqsConfig, 'SQS config should be set');
        assert(route.sqsConfig.region, 'us-west-2');
        assert(route.sqsConfig.accessKeyId, 'test-key');
        assert(route.sqsConfig.secretAccessKey, 'test-secret');
        assert(route.sqsConfig.maxMessages, 5);
        assert(route.sqsConfig.queueUrl, 'https://sqs.us-west-2.amazonaws.com/123456789012/test-queue');
    });

    it('should configure route with fromSQS using connection name', () => {
        routes.createSQSConnection('myConnection', {
            region: 'us-east-1',
            accessKeyId: 'access-key',
            secretAccessKey: 'secret-key',
            maxMessages: 10,
            waitTimeSeconds: 20,
            visibilityTimeoutSeconds: 60,
            pollingInterval: 1000
        });

        routes.init('sqsRoute1')
        .fromSQS('myConnection', {
            queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue'
        })
        .to(exchange => exchange)
        .end()

        const route = routes.getRoutes().find(r => r.name === 'sqsRoute1');
        assert(route.sqsConfig, 'SQS config should be set');
        assert(route.sqsConfig.region, 'us-east-1');
        assert(route.sqsConfig.accessKeyId, 'access-key');
        assert(route.sqsConfig.secretAccessKey, 'secret-key');
        assert(route.sqsConfig.maxMessages, 10);
        assert(route.sqsConfig.waitTimeSeconds, 20);
        assert(route.sqsConfig.visibilityTimeoutSeconds, 60);
        assert(route.sqsConfig.pollingInterval, 1000);
        assert(route.sqsConfig.queueUrl, 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue');
    });

    it('should configure route with fromSQS using direct queue URL', () => {
        routes.init('sqsRoute2')
        .fromSQS('https://sqs.us-west-2.amazonaws.com/123456789012/direct-queue', {
            region: 'us-west-2',
            accessKeyId: 'direct-key',
            secretAccessKey: 'direct-secret',
            maxMessages: 3,
            waitTimeSeconds: 15,
            visibilityTimeoutSeconds: 45,
            pollingInterval: 500
        })
        .to(exchange => exchange)
        .end()

        const route = routes.getRoutes().find(r => r.name === 'sqsRoute2');
        assert(route.sqsConfig, 'SQS config should be set');
        assert(route.sqsConfig.region, 'us-west-2');
        assert(route.sqsConfig.accessKeyId, 'direct-key');
        assert(route.sqsConfig.secretAccessKey, 'direct-secret');
        assert(route.sqsConfig.maxMessages, 3);
        assert(route.sqsConfig.waitTimeSeconds, 15);
        assert(route.sqsConfig.visibilityTimeoutSeconds, 45);
        assert(route.sqsConfig.pollingInterval, 500);
        assert(route.sqsConfig.queueUrl, 'https://sqs.us-west-2.amazonaws.com/123456789012/direct-queue');
    });

    it('should override connection settings when using fromSQS with connection name', () => {
        routes.createSQSConnection('overrideConnection', {
            region: 'us-east-1',
            accessKeyId: 'base-key',
            secretAccessKey: 'base-secret',
            maxMessages: 10,
            waitTimeSeconds: 20,
            visibilityTimeoutSeconds: 30,
            pollingInterval: 1000
        });

        routes.init('sqsRoute3')
        .fromSQS('overrideConnection', {
            queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/override-queue',
            maxMessages: 5,
            waitTimeSeconds: 15,
            pollingInterval: 2000
        })
        .to(exchange => exchange)
        .end()

        const route = routes.getRoutes().find(r => r.name === 'sqsRoute3');
        assert(route.sqsConfig, 'SQS config should be set');
        // Should use base connection settings
        assert(route.sqsConfig.region, 'us-east-1');
        assert(route.sqsConfig.accessKeyId, 'base-key');
        assert(route.sqsConfig.secretAccessKey, 'base-secret');
        assert(route.sqsConfig.visibilityTimeoutSeconds, 30);
        // Should use overridden settings
        assert(route.sqsConfig.maxMessages, 5);
        assert(route.sqsConfig.waitTimeSeconds, 15);
        assert(route.sqsConfig.pollingInterval, 2000);
        assert(route.sqsConfig.queueUrl, 'https://sqs.us-east-1.amazonaws.com/123456789012/override-queue');
    });

    it('should use default values when fromSQS is called with minimal options', () => {
        routes.init('sqsRoute4')
        .fromSQS('https://sqs.us-east-1.amazonaws.com/123456789012/default-queue')
        .to(exchange => exchange)
        .end()

        const route = routes.getRoutes().find(r => r.name === 'sqsRoute4');
        assert(route.sqsConfig, 'SQS config should be set');
        assert(route.sqsConfig.region, 'us-east-1'); // default region
        assert(route.sqsConfig.maxMessages, 10); // default maxMessages
        assert(route.sqsConfig.waitTimeSeconds, 20); // default waitTimeSeconds
        assert(route.sqsConfig.visibilityTimeoutSeconds, 30); // default visibilityTimeoutSeconds
        assert(route.sqsConfig.pollingInterval, 1000); // default pollingInterval
        assert(route.sqsConfig.queueUrl, 'https://sqs.us-east-1.amazonaws.com/123456789012/default-queue');
    });

    it('should handle multiple routes using the same SQS connection', () => {
        routes.createSQSConnection('sharedConnection', {
            region: 'eu-west-1',
            accessKeyId: 'shared-key',
            secretAccessKey: 'shared-secret',
            maxMessages: 8,
            waitTimeSeconds: 25,
            visibilityTimeoutSeconds: 50,
            pollingInterval: 1500
        });

        // First route
        routes.init('sqsRoute5')
        .fromSQS('sharedConnection', {
            queueUrl: 'https://sqs.eu-west-1.amazonaws.com/123456789012/queue1'
        })
        .to(exchange => exchange)
        .end()

        // Second route using same connection
        routes.init('sqsRoute6')
        .fromSQS('sharedConnection', {
            queueUrl: 'https://sqs.eu-west-1.amazonaws.com/123456789012/queue2'
        })
        .to(exchange => exchange)
        .end()

        const route1 = routes.getRoutes().find(r => r.name === 'sqsRoute5');
        const route2 = routes.getRoutes().find(r => r.name === 'sqsRoute6');

        // Both routes should have the same connection settings
        assert(route1.sqsConfig.region, 'eu-west-1');
        assert(route1.sqsConfig.accessKeyId, 'shared-key');
        assert(route1.sqsConfig.secretAccessKey, 'shared-secret');
        assert(route1.sqsConfig.maxMessages, 8);
        assert(route1.sqsConfig.queueUrl, 'https://sqs.eu-west-1.amazonaws.com/123456789012/queue1');

        assert(route2.sqsConfig.region, 'eu-west-1');
        assert(route2.sqsConfig.accessKeyId, 'shared-key');
        assert(route2.sqsConfig.secretAccessKey, 'shared-secret');
        assert(route2.sqsConfig.maxMessages, 8);
        assert(route2.sqsConfig.queueUrl, 'https://sqs.eu-west-1.amazonaws.com/123456789012/queue2');
    });
});
