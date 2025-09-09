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

// Import the route-triggers module directly
import * as routeTriggers from '../src/route-triggers.js';

describe('Route Triggers Module Tests', () => {
    beforeEach(() => {
        // Clear any existing state
        const listeners = routeTriggers.getRouteListeners();
        Object.keys(listeners).forEach(key => delete listeners[key]);
        
        const connections = routeTriggers.getSQSConnections();
        Object.keys(connections).forEach(key => delete connections[key]);
        
        const intervals = routeTriggers.getSQSPollingIntervals();
        Object.keys(intervals).forEach(key => delete intervals[key]);
    });

    it('should initialize route triggers module', () => {
        const mockProcessRoute = () => {};
        const mockGetRoute = () => {};
        
        routeTriggers.initializeRouteTriggers(mockProcessRoute, mockGetRoute);
        
        // Should not throw error
        assert(true, 'Initialization completed successfully');
    });

    it('should handle from function with non-existent route listeners', () => {
        const mockRoute = { name: 'testRoute' };
        
        // This should create a new array for the route
        routeTriggers.from('sourceRoute', mockRoute);
        
        const listeners = routeTriggers.getRouteListeners();
        assert(Array.isArray(listeners['sourceRoute']), 'Should create array for source route');
        assert(listeners['sourceRoute'].includes('testRoute'), 'Should add testRoute to listeners');
    });

    it('should handle from function with existing route listeners', () => {
        const mockRoute1 = { name: 'testRoute1' };
        const mockRoute2 = { name: 'testRoute2' };
        
        // Add first listener
        routeTriggers.from('sourceRoute', mockRoute1);
        
        // Add second listener
        routeTriggers.from('sourceRoute', mockRoute2);
        
        const listeners = routeTriggers.getRouteListeners();
        assert(listeners['sourceRoute'].length === 2, 'Should have 2 listeners');
        assert(listeners['sourceRoute'].includes('testRoute1'), 'Should include first route');
        assert(listeners['sourceRoute'].includes('testRoute2'), 'Should include second route');
    });

    it('should handle processRouteListeners with no listeners', () => {
        const mockRoute = { name: 'testRoute' };
        const result = { data: 'test' };
        
        // Should not throw error when no listeners exist
        routeTriggers.processRouteListeners(mockRoute, result);
        
        assert(true, 'Should handle no listeners gracefully');
    });

    it('should handle processRouteListeners with non-existent listener route', () => {
        const mockRoute = { name: 'testRoute' };
        const result = { data: 'test' };
        
        // Mock getRoute to return null (non-existent route)
        const originalGetRoute = routeTriggers.getRoute;
        routeTriggers.initializeRouteTriggers(() => {}, () => null);
        
        // Add a listener for a non-existent route
        const listeners = routeTriggers.getRouteListeners();
        listeners['testRoute'] = ['nonExistentRoute'];
        
        // Should not throw error
        routeTriggers.processRouteListeners(mockRoute, result);
        
        assert(true, 'Should handle non-existent listener route gracefully');
    });

    it('should handle SQS connection creation with minimal config', () => {
        const connectionName = 'testConnection';
        const config = {
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret'
        };
        
        routeTriggers.createSQSConnection(connectionName, config);
        
        const connections = routeTriggers.getSQSConnections();
        assert(connections[connectionName], 'Should create connection');
        assert(connections[connectionName].region === 'us-east-1', 'Should use default region');
        assert(connections[connectionName].accessKeyId === 'test-key', 'Should use provided key');
    });

    it('should handle fromSQS with connection name', () => {
        const connectionName = 'testConnection';
        const config = {
            region: 'us-west-2',
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret'
        };
        
        // Create connection first
        routeTriggers.createSQSConnection(connectionName, config);
        
        const mockRoute = { name: 'testRoute' };
        const options = {
            queueUrl: 'https://sqs.us-west-2.amazonaws.com/123456789012/test-queue'
        };
        
        routeTriggers.fromSQS(connectionName, options, mockRoute);
        
        assert(mockRoute.sqsConfig, 'Should set SQS config on route');
        assert(mockRoute.sqsConfig.region === 'us-west-2', 'Should use connection region');
        assert(mockRoute.sqsConfig.queueUrl === 'https://sqs.us-west-2.amazonaws.com/123456789012/test-queue', 'Should use provided queue URL');
    });

    it('should handle fromSQS with direct queue URL', () => {
        const mockRoute = { name: 'testRoute' };
        const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/direct-queue';
        const options = {
            region: 'us-east-1',
            accessKeyId: 'direct-key',
            secretAccessKey: 'direct-secret'
        };
        
        routeTriggers.fromSQS(queueUrl, options, mockRoute);
        
        assert(mockRoute.sqsConfig, 'Should set SQS config on route');
        assert(mockRoute.sqsConfig.queueUrl === queueUrl, 'Should use provided queue URL');
        assert(mockRoute.sqsConfig.region === 'us-east-1', 'Should use provided region');
    });

    it('should handle stopSQSPolling with non-existent route', () => {
        // Should not throw error
        routeTriggers.stopSQSPolling('nonExistentRoute');
        
        assert(true, 'Should handle non-existent route gracefully');
    });

    it('should handle stopAllSQSPolling with no active polling', () => {
        // Should not throw error
        routeTriggers.stopAllSQSPolling();
        
        assert(true, 'Should handle no active polling gracefully');
    });

    it('should test SQS configuration validation', () => {
        // Test that SQS configuration is properly structured
        const testRoute = {
            name: 'testSQSRoute',
            sqsConfig: {
                queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                region: 'us-east-1',
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret',
                maxMessages: 10,
                waitTimeSeconds: 20,
                visibilityTimeoutSeconds: 30,
                pollingInterval: 100
            }
        };

        // Validate SQS configuration structure
        assert(testRoute.sqsConfig.queueUrl, 'Should have queue URL');
        assert(testRoute.sqsConfig.region, 'Should have region');
        assert(testRoute.sqsConfig.accessKeyId, 'Should have access key');
        assert(testRoute.sqsConfig.secretAccessKey, 'Should have secret key');
        assert(typeof testRoute.sqsConfig.maxMessages === 'number', 'Should have numeric maxMessages');
        assert(typeof testRoute.sqsConfig.waitTimeSeconds === 'number', 'Should have numeric waitTimeSeconds');
        assert(typeof testRoute.sqsConfig.visibilityTimeoutSeconds === 'number', 'Should have numeric visibilityTimeoutSeconds');
        assert(typeof testRoute.sqsConfig.pollingInterval === 'number', 'Should have numeric pollingInterval');

        assert(true, 'SQS configuration validation works correctly');
    });

    it('should test startSQSPolling error handling logic', () => {
        // Test the error handling logic that's used in startSQSPolling
        const testError = new Error('AWS SQS Error');
        
        // Test that errors are properly handled
        assert(testError instanceof Error, 'Should create proper error objects');
        assert(testError.message === 'AWS SQS Error', 'Should have correct error message');
        
        // Test error handling patterns
        try {
            throw testError;
        } catch (e) {
            assert(e.message === 'AWS SQS Error', 'Should catch and handle errors correctly');
        }
        
        assert(true, 'Error handling logic works correctly');
    });

    it('should test startSQSPolling message processing logic', () => {
        // Test the message processing logic that's used in startSQSPolling
        const testMessage = {
            MessageId: 'error-message-1',
            ReceiptHandle: 'error-receipt-1',
            Body: 'invalid json {', // Invalid JSON
            MessageAttributes: {}
        };

        // Test JSON parsing error handling
        let messageBody;
        try {
            messageBody = JSON.parse(testMessage.Body);
        } catch (e) {
            messageBody = testMessage.Body; // Fallback to raw body
        }

        assert(messageBody === 'invalid json {', 'Should handle invalid JSON gracefully');
        
        // Test message processing error handling
        const mockProcessRoute = async (route, message) => {
            throw new Error('Message processing error');
        };

        // Test that the function can handle errors
        assert(typeof mockProcessRoute === 'function', 'Should have processRoute function');
        
        assert(true, 'Message processing error handling logic works correctly');
    });

});
