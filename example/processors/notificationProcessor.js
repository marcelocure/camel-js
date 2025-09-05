export default exchange => {
    console.log('Sending notification for:', exchange);
    
    // Simulate notification processing
    const notification = {
        ...exchange,
        notificationSent: true,
        notificationId: `notif_${Date.now()}`,
        sentAt: new Date(),
        type: 'order_notification'
    };
    
    return Promise.resolve(notification);
}
