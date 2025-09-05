import AWS from 'aws-sdk';

// Shared state for route triggers
let routeListeners = {}; // Track which routes listen to other routes
let sqsConnections = {}; // Track SQS connections by name
let sqsPollingIntervals = {}; // Track SQS polling intervals for cleanup

// Reference to the main module functions (will be injected)
let processRoute = null;
let getRoute = null;

// Initialize with references to main module functions
export function initializeRouteTriggers(processRouteFn, getRouteFn) {
  processRoute = processRouteFn;
  getRoute = getRouteFn;
}

// Route listener functionality
export function from(routeName, currentRoute) {
  // Register this route as a listener to the source route
  if (!routeListeners[routeName]) {
    routeListeners[routeName] = [];
  }
  routeListeners[routeName].push(currentRoute.name);
  return this;
}

// SQS connection management
export function createSQSConnection(connectionName, config) {
  // Store SQS connection configuration
  sqsConnections[connectionName] = {
    region: config.region || 'us-east-1',
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    maxMessages: config.maxMessages || 10,
    waitTimeSeconds: config.waitTimeSeconds || 20,
    visibilityTimeoutSeconds: config.visibilityTimeoutSeconds || 30,
    pollingInterval: config.pollingInterval || 1000
  };
  return this;
}

// SQS route configuration
export function fromSQS(queueNameOrUrl, options = {}, currentRoute) {
  // Check if it's a connection name or full queue URL
  let sqsConfig;
  
  if (sqsConnections[queueNameOrUrl]) {
    // It's a connection name, use stored configuration
    const connection = sqsConnections[queueNameOrUrl];
    sqsConfig = {
      queueUrl: options.queueUrl || queueNameOrUrl, // Use provided URL or connection name as URL
      region: connection.region,
      accessKeyId: connection.accessKeyId,
      secretAccessKey: connection.secretAccessKey,
      maxMessages: options.maxMessages || connection.maxMessages,
      waitTimeSeconds: options.waitTimeSeconds || connection.waitTimeSeconds,
      visibilityTimeoutSeconds: options.visibilityTimeoutSeconds || connection.visibilityTimeoutSeconds,
      pollingInterval: options.pollingInterval || connection.pollingInterval
    };
  } else {
    // It's a full queue URL, use provided options
    sqsConfig = {
      queueUrl: queueNameOrUrl,
      region: options.region || 'us-east-1',
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
      maxMessages: options.maxMessages || 10,
      waitTimeSeconds: options.waitTimeSeconds || 20,
      visibilityTimeoutSeconds: options.visibilityTimeoutSeconds || 30,
      pollingInterval: options.pollingInterval || 1000
    };
  }
  
  currentRoute.sqsConfig = sqsConfig;
  return this;
}

// SQS polling functionality
export function startSQSPolling(route) {
  const sqs = new AWS.SQS({
    region: route.sqsConfig.region,
    accessKeyId: route.sqsConfig.accessKeyId,
    secretAccessKey: route.sqsConfig.secretAccessKey
  });
  
  const pollQueue = async () => {
    try {
      const params = {
        QueueUrl: route.sqsConfig.queueUrl,
        MaxNumberOfMessages: route.sqsConfig.maxMessages,
        WaitTimeSeconds: route.sqsConfig.waitTimeSeconds,
        VisibilityTimeout: route.sqsConfig.visibilityTimeoutSeconds
      };
      
      const result = await sqs.receiveMessage(params).promise();
      
      if (result.Messages && result.Messages.length > 0) {
        for (const message of result.Messages) {
          try {
            // Parse the message body
            const messageBody = JSON.parse(message.Body);
            
            // Process the message through the route
            await processRoute(route, messageBody);
            
            // Delete the message from the queue after successful processing
            await sqs.deleteMessage({
              QueueUrl: route.sqsConfig.queueUrl,
              ReceiptHandle: message.ReceiptHandle
            }).promise();
            
            console.log(`Processed SQS message for route ${route.name}:`, message.MessageId);
          } catch (error) {
            console.error(`Error processing SQS message for route ${route.name}:`, error);
            // Message will be returned to queue after visibility timeout
          }
        }
      }
    } catch (error) {
      console.error(`Error polling SQS queue for route ${route.name}:`, error);
    }
    
    // Schedule next poll
    const intervalId = setTimeout(pollQueue, route.sqsConfig.pollingInterval);
    sqsPollingIntervals[route.name] = intervalId;
  };
  
  // Start polling
  pollQueue();
  console.log(`Started SQS polling for route ${route.name} on queue ${route.sqsConfig.queueUrl}`);
}

// SQS polling control
export function stopSQSPolling(routeName) {
  if (sqsPollingIntervals[routeName]) {
    clearTimeout(sqsPollingIntervals[routeName]);
    delete sqsPollingIntervals[routeName];
    console.log(`Stopped SQS polling for route ${routeName}`);
  }
}

export function stopAllSQSPolling() {
  Object.keys(sqsPollingIntervals).forEach(routeName => {
    stopSQSPolling(routeName);
  });
}

// Route listener processing
export function processRouteListeners(route, result) {
  // After the route finishes, trigger any listeners
  if (routeListeners[route.name]) {
    const listeners = routeListeners[route.name];
    listeners.forEach(listenerRouteName => {
      const listenerRoute = getRoute(listenerRouteName);
      if (listenerRoute) {
        // Execute the listener route with the result of the source route
        processRoute(listenerRoute, result).catch(err => {
          console.error(`Error executing listener route ${listenerRouteName}:`, err);
        });
      }
    });
  }
}

// Export the shared state for access by main module
export function getRouteListeners() {
  return routeListeners;
}

export function getSQSConnections() {
  return sqsConnections;
}

export function getSQSPollingIntervals() {
  return sqsPollingIntervals;
}
