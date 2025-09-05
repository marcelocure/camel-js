import R from 'ramda';
import Promise from 'bluebird';
import retry from './retry.js';
import AWS from 'aws-sdk';

let routes = [];
let route;
let routeListeners = {}; // Track which routes listen to other routes
let sqsConnections = {}; // Track SQS connections by name
let sqsPollingIntervals = {}; // Track SQS polling intervals for cleanup

function init(name) {
  route = {};
  route.name = name;
  route.steps = [];
  return this;
}

function to(processor) {
  route.steps.push({ unit: processor, type: 'processor' });
  return this;
}

function toRoute(routeName) {
  route.steps.push({ unit: routeName, type: 'route' });
  return this;
}

function from(routeName) {
  // Register this route as a listener to the source route
  if (!routeListeners[routeName]) {
    routeListeners[routeName] = [];
  }
  routeListeners[routeName].push(route.name);
  return this;
}

function createSQSConnection(connectionName, config) {
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

function fromSQS(queueNameOrUrl, options = {}) {
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
  
  route.sqsConfig = sqsConfig;
  return this;
}

function end() {
  routes.push(route);
  
  // If this route has SQS configuration, start polling
  // Only start polling if not in test environment
  if (route.sqsConfig && process.env.NODE_ENV !== 'test') {
    startSQSPolling(route);
  }
}

function getRoute(routeName) {
  return R.find(R.propEq('name', routeName))(routes);
}

const execPipeline = async (execRoute, exchange) => {
  const steps = execRoute.steps;
  let currentExchange = exchange;
  
  for (const step of steps) {
    try {
      currentExchange = await processStep(currentExchange, step);
    } catch (err) {
      throw err;
    }
  }
  
  return currentExchange;
};

async function processRoute(route, exchange) {
  const result = await execPipeline(route, exchange);
  
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
  
  return result;
}

const processStep = (ex, step) => {
  if (step.type === 'route') {
    return processRoute(getRoute(step.unit), ex);
  } else {
    return step.unit(ex);
  }
};

async function doRetry(retryRoute, retryExchange, retryStrategy, currentAttempt = 0) {
  let current = R.clone(currentAttempt);
  let exchange = R.clone(retryExchange);
  
  if (current === retryStrategy.retryRepetitions) {
    throw exchange;
  }
  
  current = current++;
  
  try {
    await Promise.delay(retryStrategy.retryDelay);
    
    console.log(`Retry attempt ${current}, exchange: [${JSON.stringify(exchange)}]`);
    
    try {
      const ex = await processRoute(retryRoute, exchange);
      exchange = await processRoute(retryRoute, ex);
      console.warn(`Retry attempt ${current} suceeded, exchange: [${JSON.stringify(exchange)}]`);
      return exchange;
    } catch (e) {
      exchange.exception = { error: e };
      console.error(`Retry attempt ${current} failed, exchange: [${exchange}], exception: [${e}]`);
      return await doRetry(retryRoute, exchange, retryStrategy, current + 1);
    }
  } catch (error) {
    throw error;
  }
}

function startSQSPolling(route) {
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
        VisibilityTimeoutSeconds: route.sqsConfig.visibilityTimeoutSeconds
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

function stopSQSPolling(routeName) {
  if (sqsPollingIntervals[routeName]) {
    clearTimeout(sqsPollingIntervals[routeName]);
    delete sqsPollingIntervals[routeName];
    console.log(`Stopped SQS polling for route ${routeName}`);
  }
}

function stopAllSQSPolling() {
  Object.keys(sqsPollingIntervals).forEach(routeName => {
    stopSQSPolling(routeName);
  });
}

async function sendMessage(routeName, message) {
  const targetRoute = getRoute(routeName);
  const exchange = message;
  
  try {
    return await processRoute(targetRoute, exchange);
  } catch (error) {
    const retryStrategy = retry.getStrategy(targetRoute.name);
    console.log(`Starting retries, exchange: [${JSON.stringify(exchange)}]`);
    
    try {
      return await doRetry(targetRoute, exchange, retryStrategy);
    } catch (retryError) {
      return retryStrategy.fallbackProcessor(retryError);
    }
  }
}

export default {
  onException: retry.onException,
  to,
  toRoute,
  from,
  fromSQS,
  createSQSConnection,
  stopSQSPolling,
  stopAllSQSPolling,
  init,
  end,
  getRoutes: () => routes,
  sendMessage,
};
