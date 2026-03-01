import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Assessments = () => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch documents from an API or server
        const fetchDocuments = async () => {
            try {
                // Replace with your API endpoint
                const response = await fetch('/api/patient/assessments');
                const data = await response.json();
                setDocuments(data);
            } catch (error) {
                console.error('Error fetching documents:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDocuments();
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>Patient Assessments</h1>
            {loading ? (
                <p>Loading documents...</p>
            ) : (
                <div>
                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                        {documents.map((doc) => (
                            <li key={doc.id} style={{ marginBottom: '10px' }}>
                                <a href={doc.fileUrl} download style={{ textDecoration: 'none', color: 'blue' }}>
                                    {doc.title}
                                </a>
                                <Link to={`/assessments/${doc.id}`}> View</Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default Assessments;