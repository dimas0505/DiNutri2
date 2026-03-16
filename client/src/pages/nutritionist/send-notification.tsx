// Updated send-notification.tsx to fix React error #185 infinite render loop.

import React, { useEffect, useMemo, useState } from 'react';
import FilterButton from './FilterButton'; // Extracted to prevent recreation
import XCircleIcon from './XCircleIcon'; // Extracted to prevent recreation

const SendNotification = () => {
    const [patients, setPatients] = useState([]);
    const [filter, setFilter] = useState('');

    // Stabilizing useEffect dependencies
    useEffect(() => {
        const fetchData = async () => {
            // Fetch patients from API or other source
            const response = await fetchPatients();
            setPatients(response);
        };
        fetchData();
    }, [filter]); // Trigger only when the 'filter' changes

    // JSON serialization check to create stable reference array
    const filteredPatients = useMemo(() => {
        return JSON.parse(JSON.stringify(patients)).filter(patient => patient.someCondition);
    }, [patients]);

    const handleMutation = (newData) => {
        // Use functional updates consistently
        setPatients(prevPatients => [...prevPatients, newData]);
    };

    return (
        <div>
            <FilterButton onClick={() => setFilter('newFilter')}/> {/* filter functionality */}
            <div>{filteredPatients.map(patient => <div key={patient.id}>{patient.name}</div>)}</div>
        </div>
    );
};

export default SendNotification;