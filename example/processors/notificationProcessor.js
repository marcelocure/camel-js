import { v4 as uuidv4 } from 'uuid';

export default exchange => {
    console.log('Sending notification for:', exchange);
    
    // Simulate notification processing
    const notification = {
        ...exchange,
        notificationSent: true,
        notificationId: uuidv4(),
        sentAt: new Date(),
        type: 'order_notification'
    };
    
    return Promise.resolve(notification);
}
