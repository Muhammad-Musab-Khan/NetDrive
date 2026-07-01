import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext'; // Make sure this path is correct

const MyVehicles = () => {
    const [myVehicles, setMyVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Get the logged-in user from your AuthContext
    const { user } = useContext(AuthContext);
    const vendorId = user?.id; // This uses the logged-in vendor's ID

    useEffect(() => {
        if (!vendorId) {
            setError("You must be logged in to see your vehicles.");
            setLoading(false);
            return;
        }

        const fetchMyVehicles = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`/api/vehicles/vendor/${vendorId}`);
                setMyVehicles(res.data.vehicles);
                setError('');
            } catch (err) {
                setError('Failed to fetch your vehicles. ' + (err.response?.data?.msg || err.message));
            } finally {
                setLoading(false);
            }
        };

        fetchMyVehicles();
    }, [vendorId]);

    if (loading) return <div>Loading your vehicles...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h2>My Listed Vehicles</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {myVehicles.length > 0 ? (
                    myVehicles.map(vehicle => (
                        <Link key={vehicle._id} to={`/edit-vehicle/${vehicle._id}`} style={{ textDecoration: 'none', color: 'inherit', border: '1px solid #ccc', padding: '10px', borderRadius: '8px' }}>
                            <h3>{vehicle.make} ({vehicle.model_year})</h3>
                            <p>Registration: {vehicle.registration_no}</p>
                            <p>Status: <span style={{ color: vehicle.status === 'active' ? 'green' : 'red' }}>{vehicle.status}</span></p>
                        </Link>
                    ))
                ) : <p>You have not listed any vehicles yet.</p>}
            </div>
        </div>
    );
};

export default MyVehicles;