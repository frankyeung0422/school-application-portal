import React, { useState, useEffect } from 'react';
import './NotificationBell.css';

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const userEmail = localStorage.getItem('userEmail');

  useEffect(() => {
    if (isLoggedIn && userEmail) {
      fetchNotifications();
    }
  }, [isLoggedIn, userEmail]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Get applications from localStorage to create notifications
      const applications = JSON.parse(localStorage.getItem('applications') || '[]');
      const userApplications = applications.filter(app => app.parentEmail === userEmail);
      
      // Create notifications from applications
      const mockNotifications = userApplications.map(app => ({
        _id: `notification_${app.id}`,
        title: `Application Submitted`,
        message: `Your application for ${app.kindergartenName} has been submitted successfully.`,
        type: 'application_submitted',
        priority: 'medium',
        status: 'pending',
        schoolName: app.kindergartenName,
        createdAt: app.submittedAt,
        status: 'pending'
      }));

      // Add some mock notifications for demo
      const demoNotifications = [
        {
          _id: 'demo_1',
          title: 'Application Deadline Reminder',
          message: 'Don\'t forget! Application deadline for St. Mary\'s Kindergarten is approaching.',
          type: 'deadline_reminder',
          priority: 'high',
          status: 'pending',
          schoolName: 'St. Mary\'s Kindergarten',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
        },
        {
          _id: 'demo_2',
          title: 'Website Updated',
          message: 'The application portal has been updated with new features.',
          type: 'website_update',
          priority: 'low',
          status: 'read',
          schoolName: 'System',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        }
      ];

      const allNotifications = [...mockNotifications, ...demoNotifications];
      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => n.status === 'pending').length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif._id === notificationId 
          ? { ...notif, status: 'read' }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, status: 'read' }))
    );
    setUnreadCount(0);
  };

  const deleteNotification = async (notificationId) => {
    setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'application_submitted':
        return '📝';
      case 'application_open':
        return '🎉';
      case 'application_closed':
        return '🔒';
      case 'website_update':
        return '📝';
      case 'deadline_reminder':
        return '⏰';
      default:
        return '📢';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return '#dc3545';
      case 'high':
        return '#fd7e14';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="notification-bell-container">
      <div 
        className="notification-bell"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </div>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={markAllAsRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="loading-notifications">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="no-notifications">
                <span>🎉</span>
                <p>No new notifications</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification._id} 
                  className={`notification-item ${notification.status === 'pending' ? 'unread' : ''}`}
                  onClick={() => markAsRead(notification._id)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-header-row">
                      <h4>{notification.title}</h4>
                      <span 
                        className="priority-badge"
                        style={{ backgroundColor: getPriorityColor(notification.priority) }}
                      >
                        {notification.priority}
                      </span>
                    </div>
                    <p>{notification.message}</p>
                    <div className="notification-meta">
                      <span className="school-name">{notification.schoolName}</span>
                      <span className="time-ago">{formatTimeAgo(notification.createdAt)}</span>
                    </div>
                  </div>
                  <button 
                    className="delete-notification-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification._id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="notification-footer">
            <a href="/profile" className="view-all-link">
              View all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell; 