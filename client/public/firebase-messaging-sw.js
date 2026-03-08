importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Настройки Firebase те же, что и в основном приложении
const firebaseConfig = {
    apiKey: "AIzaSyABD9IJJFkuRbs_WXWdMXx1VT8KltWXwBw",
    authDomain: "catlover-messenger-3d6f1.firebaseapp.com",
    projectId: "catlover-messenger-3d6f1",
    storageBucket: "catlover-messenger-3d6f1.firebasestorage.app",
    messagingSenderId: "304931087092",
    appId: "1:304931087092:web:93f01198a9fae3a67934a1"
};

// Инициализируем Firebase в Service Worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Обработка сообщений в фоновом режиме (когда вкладка браузера закрыта)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title || 'Новое сообщение';
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon || '/favicon.ico',
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
