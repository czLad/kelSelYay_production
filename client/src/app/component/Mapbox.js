'use client';

import { useState, useEffect, useRef } from "react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import DetailModal from "./DetailModal";
import AddReportButton from "./AddReportButton";
import { useRouter } from "next/router";

const mapbox_accesstoken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function Mapbox() {
    const mapContainerRef = useRef(null);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const mapRef = useRef(null); // Store map reference
    const [missingPeople, setMissingPeople] = useState([]);
    const markersRef = useRef(new Map()); // Store markers by ID

    // Function to handle marker click
    const handleMarkerClick = (person) => {
        console.log("Marker clicked:", person);
        setSelectedPerson(person);
    };

    // Function to close modal
    const handleCloseModal = () => {
        setSelectedPerson(null);
    };

    // Handle successful update from modal
    const handleDetailUpdate = (updatedPerson) => {
        console.log("Person updated:", updatedPerson);

        //special case if found / reportSighting was updated
        if (updatedPerson.found) {
            // ✅ REMOVE from missingPeople immediately
            setMissingPeople(prevPeople => 
                prevPeople.filter(person => 
                    (person._id || person.id) !== (updatedPerson._id || updatedPerson.id)
                )
            );
    
            // ✅ Optionally remove the marker too
            const personId = updatedPerson._id || updatedPerson.id;
            const marker = markersRef.current.get(personId);
            if (marker) {
                marker.remove();
                markersRef.current.delete(personId);
            }
    
            // ✅ Close the modal
            setSelectedPerson(null);
            return; // stop here since we don't need to update the marker visuals
        }
        
        // Update the person in the local state
        setMissingPeople(prevPeople => 
            prevPeople.map(person => 
                (person._id || person.id) === (updatedPerson._id || updatedPerson.id) 
                    ? updatedPerson 
                    : person
            )
        );
        
        // Update the selected person so modal shows updated data
        setSelectedPerson(updatedPerson);
        
        // Update the marker
        const personId = updatedPerson._id || updatedPerson.id;
        const marker = markersRef.current.get(personId);
        
        if (marker && marker.getElement()) {
            // Update the marker's image
            let imgUrl = updatedPerson.imageUrl;
            if(!imgUrl || imgUrl === 'https://example.com/image.jpg' || imgUrl === 'https://example.com/updated-image.jpg'){
                imgUrl = '/testPic.png';
            }
            
            const el = marker.getElement();
            el.style.backgroundImage = `url(${imgUrl})`;
        }
    };
    
    // Handle successful deletion from modal
    const handleDetailDelete = (deletedId) => {
        console.log("Person deleted:", deletedId);
        
        // Remove the person from local state
        setMissingPeople(prevPeople => 
            prevPeople.filter(person => 
                (person._id || person.id) !== deletedId
            )
        );
        
        // Remove the marker from the map
        const marker = markersRef.current.get(deletedId);
        if (marker) {
            marker.remove();
            markersRef.current.delete(deletedId);
        }
    };

    const handleNewReport = (newReport) => {
        setMissingPeople(prev => [...prev, newReport]);
    }

    // Format time to match test data format
    const formatTimeSinceMissing = (hours) => {
        if (!hours && hours !== 0) return "Unknown";
        
        if (hours < 24) {
            return `${hours} hours ago`;
        } else {
            const days = Math.floor(hours / 24);
            const date = new Date();
            date.setDate(date.getDate() - days);
            const month = date.toLocaleString('default', { month: 'long' });
            return `${month} ${date.getDate()}, 2025 (${days} days ago)`;
        }
    };

    const fetchMissingPeople = async() => {
        try {
            const response = await fetch("http://localhost:3002/api/reports/notfound", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                mode: 'cors'
            });

            if(!response.ok) {
                throw new Error(`API issue when trying to fetch reports: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("API data:", data);
            setMissingPeople(data); // Store fetched people in state
            
            return data;
        } catch (error) {
            console.error("Error fetching missing people:", error);
            return [];
        }
    };

    // Function to add markers to the map
    const addMarkersToMap = (map, people) => {
        console.log(`Adding ${people.length} markers to map`);
        
        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current.clear();
        
        // Keep track of coordinates to avoid exact overlaps
        const usedCoordinates = new Map();
        
        // Add markers for missing persons
        people.forEach((person, index) => {
            console.log(`Processing marker ${index + 1}:`, person);
            
            // Create custom marker element
            let imgUrl = person.imageUrl;
            if(!imgUrl || imgUrl === 'https://example.com/image.jpg' || imgUrl === 'https://example.com/updated-image.jpg'){
                imgUrl = '/testPic.png';
            }

            const el = document.createElement('div');
            el.className = 'missing-person-marker';
            el.style.backgroundImage = `url(${imgUrl})`;
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            el.style.width = '40px';
            el.style.height = '40px';
            el.style.borderRadius = '50%';
            el.style.border = '3px solid red'; // Add red border
            el.style.boxSizing = 'border-box'; // Ensure border is included in width/height
            el.style.cursor = 'pointer';
            
            // Add data attribute for identification
            el.dataset.personId = person._id || person.id;
            
            // Get coordinates with offset to prevent exact overlaps
            let lat = person.lat ? person.lat : 21.9162;
            let lng = person.lng ? person.lng : 95.9560;
            
            // Create a unique key for these coordinates
            const coordKey = `${lat},${lng}`;
            
            // If these exact coordinates are already used, offset slightly
            if (usedCoordinates.has(coordKey)) {
                const offset = usedCoordinates.get(coordKey) * 0.001; // Small offset
                lat += offset;
                lng += offset;
                usedCoordinates.set(coordKey, usedCoordinates.get(coordKey) + 1);
            } else {
                usedCoordinates.set(coordKey, 1);
            }
            
            console.log(`Marker ${index + 1} coordinates:`, [lng, lat]);
            
            try {
                // Create marker
                const marker = new mapboxgl.Marker(el)
                    .setLngLat([lng, lat])
                    .addTo(map);
                
                // Store marker reference by person ID for later updates
                markersRef.current.set(person._id || person.id, marker);
                
                // Add click event
                el.addEventListener('click', () => {
                    // Make a deep copy to avoid reference issues
                    const personData = {...person};
                    // Ensure the Modal has all needed fields
                    personData.id = personData._id || personData.id;
                    handleMarkerClick(personData);
                });
                
                console.log(`Successfully added marker ${index + 1}`);
            } catch (error) {
                console.error(`Error adding marker ${index + 1}:`, error);
            }
        });
    };

    useEffect(() => {

        // Initialize map
        mapboxgl.accessToken = mapbox_accesstoken;
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [96.0891, 21.9588],
            zoom: 13
        });
        
        // Store map reference
        mapRef.current = map;

        map.on('load', async () => {
            try {
                // Fetch missing people data from API
                const peopleData = await fetchMissingPeople();
                
                // Add markers to map
                addMarkersToMap(map, peopleData);
                
            } catch (error) {
                console.error("Error loading data:", error);
                // Fall back to empty data if there's an error
                addMarkersToMap(map, []);
            }
        });

        // Add geolocation control
        map.addControl(
            new mapboxgl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true
                },
                trackUserLocation: true,
                showUserHeading: true,
            })
        );

        return () => map.remove();
    }, []);

    useEffect(() => {
        if (mapRef.current) {
            addMarkersToMap(mapRef.current, missingPeople);
        }
    }, [missingPeople]);



    return (
        <>
            <div id="map" ref={mapContainerRef} style={{ width: '100%', height: '100vh' }} />
            
            {/* Render modal when a person is selected */}
            {selectedPerson && (
                <DetailModal 
                    detail={selectedPerson}
                    onClose={handleCloseModal}
                    onUpdateSuccess={handleDetailUpdate}
                    onDeleteSuccess={handleDetailDelete}

                />
            )}

            {/* Floating button */}
            <AddReportButton onReportSubmitted={handleNewReport}/>
            
            {/* Add some basic styling for the markers */}
            <style jsx global>{`
                .missing-person-marker {
                    cursor: pointer;
                    z-index: 2;
                }
                
                .custom-marker {
                    z-index: 1;
                }
            `}</style>
        </>
    );
}

export default Mapbox;