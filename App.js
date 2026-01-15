import { registerRootComponent } from 'expo';
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { LogBox, View, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Configure notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// Ignore warnings
LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
]);

function App() {
    useEffect(() => {
        // Force hide splash screen after 2 seconds to be sure
        setTimeout(async () => {
            await SplashScreen.hideAsync();
        }, 2000);
    }, []);

    const requestNotificationPermissions = async () => {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Notification permission not granted');
            }
        } catch (error) {
            console.log('Notifications error:', error.message);
        }
    };

    useEffect(() => {
        requestNotificationPermissions();
    }, []);

    return (
        <ThemeProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <AppNavigator />
            </GestureHandlerRootView>
        </ThemeProvider>
    );
}

export default App;
registerRootComponent(App);
