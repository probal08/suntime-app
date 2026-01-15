# Suntime

Suntime is a mobile application built with React Native and Expo designed to help users manage their sun exposure, track UV indices, and maintain healthy habits.

## Features

- **Sun & UV Tracking**: Get real-time UV index data based on your current location.
- **Progress Monitoring**: Track your history and progress over time with visual charts.
- **Educational Resources**: Access a "Learn" section to understand more about sun safety and health.
- **User Profiles**: Manage your personal data and preferences.
- **Secure Authentication**: Login and registration system to keep your data safe.
- **Smart Notifications**: Receive alerts and reminders.
- **Local Authentication**: Support for biometric security (fingerprint/face ID).

## Screenshots

<!-- Add screenshots of your app here -->
<!-- <img src="assets/screenshot1.png" width="300" /> -->

## Technologies Used

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Navigation**: [React Navigation](https://reactnavigation.org/)
- **Charts**: [React Native Chart Kit](https://www.npmjs.com/package/react-native-chart-kit)
- **Icons**: [Lucide React Native](https://lucide.dev/)
- **Storage**: Async Storage
- **Native Modules**: Expo Location, Expo Notifications, Expo Haptics, Expo Local Authentication

## Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/probal08/suntime-app.git
    cd suntime-app
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Start the application**
    ```bash
    npx expo start
    ```

4.  **Run on Device**
    - Scan the QR code with the **Expo Go** app on Android or iOS.
    - Or press `a` to run on Android Emulator, `i` for iOS Simulator.

## detailed Folder Structure

```
Suntime/
├── assets/             # Images and aesthetic assets
├── src/
│   ├── components/     # Reusable UI components
│   ├── constants/      # App constants (colors, layouts)
│   ├── context/        # Context API (Theme, Auth states)
│   ├── navigation/     # App navigation setup (Stack/Tab)
│   ├── screens/        # Main application screens (Home, Profile, etc.)
│   └── utils/          # Helper functions and logic
└── App.js              # Entry point
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
