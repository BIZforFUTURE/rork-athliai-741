import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Map } from 'lucide-react-native';
import * as Location from 'expo-location';
import { MapView, Polyline, Marker, PROVIDER_GOOGLE } from './MapComponents';

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

interface RunMapProps {
  currentLocation: Location.LocationObject | null;
  routeCoordinates: RouteCoordinate[];
  showMap: boolean;
  isRunning: boolean;
  isHistorical?: boolean; // For showing past runs
  title?: string; // Custom title for the map
}

export default function RunMap({ 
  currentLocation, 
  routeCoordinates, 
  showMap, 
  isRunning, 
  isHistorical = false, 
  title 
}: RunMapProps) {
  const { width: screenWidth } = useWindowDimensions();
  const mapTitle = title || (isHistorical ? "Route Map" : "Live Route");
  const shouldShow = showMap || isHistorical;
  const mapRef = useRef<any>(null);

  // Calculate route distance to determine appropriate zoom level
  const routeDistance = useMemo(() => {
    if (routeCoordinates.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < routeCoordinates.length; i++) {
      const prev = routeCoordinates[i - 1];
      const curr = routeCoordinates[i];
      
      // Haversine formula for distance calculation
      const R = 6371; // Earth's radius in km
      const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
      const dLon = (curr.longitude - prev.longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(prev.latitude * Math.PI / 180) * Math.cos(curr.latitude * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      totalDistance += R * c;
    }
    return totalDistance;
  }, [routeCoordinates]);

  // Memoize map region calculation for performance with dynamic zoom
  const mapRegion = useMemo(() => {
    if (routeCoordinates.length > 0) {
      // Calculate bounds from route coordinates
      const latitudes = routeCoordinates.map(coord => coord.latitude);
      const longitudes = routeCoordinates.map(coord => coord.longitude);
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      
      // Dynamic zoom based on route distance
      let paddingMultiplier = 1.2; // Default 20% padding
      if (routeDistance > 5) { // More than 5km
        paddingMultiplier = 1.5; // 50% padding for long routes
      } else if (routeDistance > 2) { // More than 2km
        paddingMultiplier = 1.3; // 30% padding for medium routes
      }
      
      const latDelta = Math.max((maxLat - minLat) * paddingMultiplier, 0.005);
      const lngDelta = Math.max((maxLng - minLng) * paddingMultiplier, 0.005);
      
      return {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };
    } else if (currentLocation) {
      return {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
    }
    return null;
  }, [routeCoordinates, currentLocation, routeDistance]);

  // Auto-adjust map region when route gets longer during live runs
  useEffect(() => {
    if (isRunning && !isHistorical && mapRef.current && mapRegion && routeCoordinates.length > 10) {
      // Only auto-adjust after we have a reasonable number of points
      // and when the route distance exceeds certain thresholds
      if (routeDistance > 1) { // More than 1km
        mapRef.current.animateToRegion(mapRegion, 1000); // Animate over 1 second
      }
    }
  }, [isRunning, isHistorical, mapRegion, routeCoordinates.length, routeDistance]);

  if (!shouldShow) {
    return null;
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.mapContainer}>
        <View style={styles.mapHeader}>
          <Map size={20} color="#3B82F6" />
          <Text style={styles.mapTitle}>{mapTitle}</Text>
        </View>
        <View style={[styles.map, styles.webMapFallback, { width: screenWidth - 40 }]}>
          <Text style={styles.webMapText}>Map view available on mobile devices</Text>
          <Text style={styles.webMapSubtext}>
            {isHistorical 
              ? (routeCoordinates.length > 0 ? "Route data is available" : "No route data recorded")
              : "Your route is being tracked"
            }
          </Text>
        </View>
      </View>
    );
  }

  // For historical routes, we don't need current location if we have route coordinates
  if (!isHistorical && !currentLocation) {
    return null;
  }

  // If MapView is not available (web platform), show fallback
  if (!MapView) {
    return (
      <View style={styles.mapContainer}>
        <View style={styles.mapHeader}>
          <Map size={20} color="#3B82F6" />
          <Text style={styles.mapTitle}>{mapTitle}</Text>
        </View>
        <View style={[styles.map, styles.webMapFallback, { width: screenWidth - 40 }]}>
          <Text style={styles.webMapText}>Map view available on mobile devices</Text>
          <Text style={styles.webMapSubtext}>
            {isHistorical 
              ? (routeCoordinates.length > 0 ? "Route data is available" : "No route data recorded")
              : "Your route is being tracked"
            }
          </Text>
        </View>
      </View>
    );
  }

  if (!mapRegion) {
    return null;
  }

  return (
    <View style={styles.mapContainer}>
      <View style={styles.mapHeader}>
        <Map size={20} color="#3B82F6" />
        <Text style={styles.mapTitle}>{mapTitle}</Text>
      </View>
      {React.createElement(MapView, {
        ref: mapRef,
        style: [styles.map, { width: screenWidth - 40 }],
        provider: Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined,
        initialRegion: mapRegion,
        showsUserLocation: !isHistorical,
        followsUserLocation: !isHistorical && isRunning && routeDistance < 0.5, // Only follow for short routes
        showsMyLocationButton: false,
        showsCompass: false,
        toolbarEnabled: false,
        mapType: "standard",
        pitchEnabled: false,
        rotateEnabled: false,
        scrollEnabled: true,
        zoomEnabled: true,
      }, [
        // Route polyline
        routeCoordinates.length > 1 && Polyline && React.createElement(Polyline, {
          key: "route-polyline",
          coordinates: routeCoordinates,
          strokeColor: isHistorical ? "#8B5CF6" : "#3B82F6",
          strokeWidth: 4,
          lineCap: "round",
          lineJoin: "round",
          geodesic: true,
        }),
        
        // Start marker - Green for start
        routeCoordinates.length > 0 && Marker && React.createElement(Marker, {
          key: "start-marker",
          coordinate: routeCoordinates[0],
          title: "Start",
          description: "Starting point of your run",
          pinColor: "#10B981",
          identifier: "start-marker",
        }),
        
        // End marker - Red for finish
        routeCoordinates.length > 1 && Marker && React.createElement(Marker, {
          key: "end-marker",
          coordinate: routeCoordinates[routeCoordinates.length - 1],
          title: "Finish",
          description: "End point of your run",
          pinColor: "#EF4444",
          identifier: "end-marker",
        }),
      ].filter(Boolean))}
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    overflow: "hidden",
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  map: {
    height: 200,
  },
  webMapFallback: {
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  webMapText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  webMapSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});