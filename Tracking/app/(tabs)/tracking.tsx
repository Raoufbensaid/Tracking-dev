// app/tracking.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import axios from "axios";

export default function TrackingScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  // États pour la gestion du tracking
  const [trackingStarted, setTrackingStarted] = useState(false);
  const [trackingPaused, setTrackingPaused] = useState(false);
  const [trackingFinished, setTrackingFinished] = useState(false);
  const [trackingSubscription, setTrackingSubscription] =
    useState<Location.LocationSubscription | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [path, setPath] = useState<
    {
      latitude: number;
      longitude: number;
      altitude: number | null;
      timestamp: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Enregistrer le temps de début du tracking
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Adresse de votre back-end – modifiez selon votre configuration réseau
  const API_URL = "http://192.168.1.182:3000";

  // Demande de permission et récupération de la position initiale
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoading(false);
        Alert.alert(
          "Permission refusée",
          "Veuillez autoriser l'accès à la localisation."
        );
        return;
      }
      const initialLocation = await Location.getCurrentPositionAsync({});
      console.log("Position initiale récupérée :", initialLocation);
      setLocation(initialLocation);
      setLoading(false);
    })();
  }, []);

  // Démarrer le tracking
  const handleStart = async () => {
    console.log("Tracking démarré");
    setTrackingStarted(true);
    setTrackingPaused(false);
    if (!startTime) {
      const now = new Date();
      setStartTime(now);
      console.log("Temps de début enregistré :", now);
    }
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (newLocation) => {
        console.log("Nouvelle position reçue :", newLocation);
        // Transformation de la nouvelle position pour ne garder que les infos nécessaires
        const point = {
          latitude: newLocation.coords.latitude,
          longitude: newLocation.coords.longitude,
          altitude: newLocation.coords.altitude || null,
          timestamp: newLocation.timestamp,
        };
        setPath((prev) => [...prev, point]);
        setLocation(newLocation);
      }
    );
    setTrackingSubscription(subscription);
  };

  // Mettre en pause le tracking
  const handlePause = async () => {
    if (trackingSubscription) {
      trackingSubscription.remove();
      console.log("Tracking mis en pause");
      setTrackingSubscription(null);
      setTrackingPaused(true);
    }
  };

  // Reprendre le tracking
  const handleResume = async () => {
    console.log("Tracking repris");
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (newLocation) => {
        console.log("Nouvelle position reçue (resume):", newLocation);
        const point = {
          latitude: newLocation.coords.latitude,
          longitude: newLocation.coords.longitude,
          altitude: newLocation.coords.altitude || null,
          timestamp: newLocation.timestamp,
        };
        setPath((prev) => [...prev, point]);
        setLocation(newLocation);
      }
    );
    setTrackingSubscription(subscription);
    setTrackingPaused(false);
  };

  // Fonction pour générer le contenu GPX à partir du chemin (path)
  const generateGpxContent = (): string => {
    let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="TrackingApp">\n  <trk>\n    <name>Parcours terminé</name>\n    <trkseg>\n`;
    path.forEach((point) => {
      gpxContent += `      <trkpt lat="${point.latitude}" lon="${point.longitude}"></trkpt>\n`;
    });
    gpxContent += `    </trkseg>\n  </trk>\n</gpx>`;
    console.log("Contenu GPX généré :", gpxContent);
    return gpxContent;
  };

  // Fonction pour calculer la distance totale parcourue (approximative)
  const computeDistance = (): number => {
    let total = 0;
    const toRad = (x: number) => (x * Math.PI) / 180;
    for (let i = 1; i < path.length; i++) {
      const lat1 = path[i - 1].latitude;
      const lon1 = path[i - 1].longitude;
      const lat2 = path[i].latitude;
      const lon2 = path[i].longitude;
      const R = 6371e3;
      const φ1 = toRad(lat1);
      const φ2 = toRad(lat2);
      const Δφ = toRad(lat2 - lat1);
      const Δλ = toRad(lon2 - lon1);
      const a =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      total += R * c;
    }
    console.log("Distance totale calculée :", total);
    return total;
  };

  // Fonction pour sauvegarder le track dans la base de données via POST
  const saveTrackToDB = async () => {
    const endTime = new Date();
    const gpxContent = generateGpxContent();
    const totalDistance = computeDistance();
    const trackData = {
      userId: "12345", // Remplacez par l'ID utilisateur réel
      startTime: startTime || new Date(),
      endTime,
      distance: totalDistance,
      path, // path contient désormais les points avec latitude, longitude, altitude et timestamp
      gpxContent,
    };

    try {
      const response = await axios.post(`${API_URL}/tracks`, trackData);
      console.log("Track saved to DB:", response.data);
      Alert.alert(
        "Succès",
        "Le track a été enregistré dans la base de données."
      );
    } catch (error) {
      console.error(
        "Erreur lors de l'enregistrement du track dans la DB:",
        error
      );
      Alert.alert(
        "Erreur",
        "L'enregistrement du track a échoué. Vérifiez la console pour plus de détails."
      );
    }
  };

  // Popup de confirmation pour envoyer le résultat au back-end
  const confirmSendResult = () => {
    Alert.alert(
      "Envoi du résultat",
      "Êtes-vous sûr de vouloir envoyer le résultat au back-end ?",
      [
        {
          text: "Non",
          onPress: () => console.log("Envoi annulé"),
          style: "cancel",
        },
        {
          text: "Oui",
          onPress: async () => {
            console.log("Envoi confirmé");
            if (trackingSubscription) {
              trackingSubscription.remove();
              setTrackingSubscription(null);
            }
            setTrackingFinished(true);
            setTrackingStarted(false);
            setTrackingPaused(false);
            await saveTrackToDB();
          },
        },
      ],
      { cancelable: false }
    );
  };

  // Fonction pour recentrer la carte sur la position actuelle
  const centerMap = () => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
      console.log("Carte recentrée sur la position :", location.coords);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête avec bouton Retour */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Status tracking</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Carte */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location?.coords.latitude || 48.8566,
            longitude: location?.coords.longitude || 2.3522,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Polyline
            coordinates={path.map((point) => ({
              latitude: point.latitude,
              longitude: point.longitude,
            }))}
            strokeColor="#0000FF"
            strokeWidth={3}
          />
          {location && (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="Vous êtes ici"
              description="Position actuelle"
              pinColor="red"
            />
          )}
        </MapView>
        {/* Bouton "Centrer" en bas à droite sur la carte */}
        <TouchableOpacity style={styles.centerButton} onPress={centerMap}>
          <Text style={styles.centerButtonText}>Centrer</Text>
        </TouchableOpacity>
      </View>

      {/* Contrôles en bas */}
      <View style={styles.bottomContainer}>
        {!trackingStarted && !trackingFinished && (
          <Button title="Start" onPress={handleStart} />
        )}
        {trackingStarted && !trackingFinished && trackingPaused && (
          <View style={styles.buttonRow}>
            <Button title="Resume" onPress={handleResume} />
            <Button title="Terminer" onPress={confirmSendResult} />
          </View>
        )}
        {trackingStarted && !trackingFinished && !trackingPaused && (
          <View style={styles.buttonRow}>
            <Button title="Pause" onPress={handlePause} />
            <Button title="Terminer" onPress={confirmSendResult} />
          </View>
        )}
        {trackingFinished && (
          <Text style={styles.finishedText}>Tracking terminé</Text>
        )}
      </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#2196F3",
  },
  backText: {
    color: "#fff",
    fontSize: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  centerButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 30,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  centerButtonText: {
    color: "#2196F3",
    fontWeight: "bold",
  },
  bottomContainer: {
    padding: 16,
    backgroundColor: "#f0f0f0",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  finishedText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    color: "green",
  },
});
