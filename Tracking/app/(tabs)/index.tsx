// app/index.tsx
import React from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  const handleLaunchTracking = () => {
    router.push("/tracking");
  };

  const handleHistory = () => {
    router.push("/history");
  };

  const handleAdresse = () => {
    router.push("/adresse");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue sur Tracking</Text>
      <Button title="Lancer le tracking" onPress={handleLaunchTracking} />
      <View style={styles.spacing} />
      <Button title="Voir l'historique" onPress={handleHistory} />
      <View style={styles.spacing} />
      <Button title="Adressé" onPress={handleAdresse} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  spacing: {
    height: 20,
  },
});
