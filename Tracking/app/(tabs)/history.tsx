// app/history.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Button,
} from "react-native";
import axios from "axios";
import { useRouter } from "expo-router";

export default function HistoryScreen() {
  const router = useRouter();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Remplacez par l'adresse IP de votre machine
  const API_URL = "http://192.168.1.182:3000";

  const fetchTracks = async () => {
    console.log("Récupération des tracks depuis le backend...");
    try {
      const response = await axios.get(`${API_URL}/tracks`);
      console.log("Réponse du backend :", response.data);
      setTracks(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de la récupération des tracks :", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button title="Retour" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Historique des tracks</Text>
        <View style={{ width: 60 }} />
      </View>
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#2196F3"
          style={styles.loadingIndicator}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {tracks.length === 0 ? (
            <Text style={styles.noDataText}>Aucun track enregistré</Text>
          ) : (
            tracks.map((track) => (
              <TouchableOpacity
                key={track._id}
                style={styles.trackItem}
                onPress={() => router.push(`/trackDetail?id=${track._id}`)}
              >
                <Text style={styles.trackText}>
                  Début : {new Date(track.startTime).toLocaleString()}
                </Text>
                <Text style={styles.trackText}>
                  Fin : {new Date(track.endTime).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#2196F3",
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  loadingIndicator: {
    marginTop: 50,
  },
  scrollContainer: {
    padding: 16,
  },
  trackItem: {
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
  },
  trackText: {
    fontSize: 16,
  },
  noDataText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
});
