// app/trackDetail.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Button,
} from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function TrackDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id } = params as { id: string };
  const [track, setTrack] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  // Remplacez par l'adresse IP ou domaine de votre back-end
  const API_URL = "http://192.168.1.182:3000";

  useEffect(() => {
    const fetchTrack = async () => {
      try {
        console.log("Récupération du track avec id :", id);
        const response = await axios.get(`${API_URL}/tracks/${id}`);
        console.log("Données du track récupérées :", response.data);
        setTrack(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la récupération du track :", error);
        setLoading(false);
      }
    };
    if (id) {
      fetchTrack();
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!track) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Aucun track trouvé.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Extraction des coordonnées : on vérifie d'abord le champ "path", sinon "coordinates"
  const coordinates =
    track.path && track.path.length > 0
      ? track.path.map((pt: any) => ({
          latitude: pt.latitude,
          longitude: pt.longitude,
        }))
      : track.coordinates && track.coordinates.length > 0
      ? track.coordinates.map((pt: any) => ({
          latitude: pt[0],
          longitude: pt[1],
        }))
      : [];

  // Définir le point de départ et d'arrivée
  const startCoord = coordinates[0];
  const endCoord = coordinates[coordinates.length - 1];

  // Fonction pour calculer une région englobant toutes les coordonnées
  const getMapRegion = (
    points: { latitude: number; longitude: number }[]
  ): Region => {
    if (points.length === 0) {
      return {
        latitude: 48.8566,
        longitude: 2.3522,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    let minLat = points[0].latitude;
    let maxLat = points[0].latitude;
    let minLng = points[0].longitude;
    let maxLng = points[0].longitude;
    points.forEach((point) => {
      if (point.latitude < minLat) minLat = point.latitude;
      if (point.latitude > maxLat) maxLat = point.latitude;
      if (point.longitude < minLng) minLng = point.longitude;
      if (point.longitude > maxLng) maxLng = point.longitude;
    });
    const latitude = (minLat + maxLat) / 2;
    const longitude = (minLng + maxLng) / 2;
    const latitudeDelta = (maxLat - minLat) * 1.5 || 0.01;
    const longitudeDelta = (maxLng - minLng) * 1.5 || 0.01;
    return { latitude, longitude, latitudeDelta, longitudeDelta };
  };

  const region = getMapRegion(coordinates);

  // Fonction pour télécharger (partager) le fichier GPX
  const downloadGpx = async () => {
    if (!track.gpxContent) {
      console.log("Aucun contenu GPX disponible pour ce track.");
      return;
    }
    const fileUri = FileSystem.documentDirectory + `track_${id}.gpx`;
    try {
      await FileSystem.writeAsStringAsync(fileUri, track.gpxContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      console.log("Fichier GPX sauvegardé localement :", fileUri);
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      console.error("Erreur lors du téléchargement du fichier GPX :", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* En-tête avec bouton Retour */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail du Track</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Carte */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        minZoomLevel={0} // Permet de garder tous les points visibles même en dézoomant
      >
        {coordinates.length > 0 && (
          <Polyline
            coordinates={coordinates}
            strokeColor="#0000FF"
            strokeWidth={3}
          />
        )}
        {/* Marqueur de départ en vert */}
        {startCoord && (
          <Marker
            coordinate={startCoord}
            title="Départ"
            description="Point de départ"
            pinColor="green"
          />
        )}
        {/* Marqueur d'arrivée standard */}
        {endCoord && (
          <Marker
            coordinate={endCoord}
            title="Arrivée"
            description="Point d'arrivée"
          />
        )}
      </MapView>

      {/* Bouton pour télécharger le fichier GPX */}
      <View style={styles.downloadContainer}>
        <Button title="Télécharger GPX" onPress={downloadGpx} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  map: {
    flex: 1,
  },
  downloadContainer: {
    padding: 16,
    backgroundColor: "#f0f0f0",
  },
});
