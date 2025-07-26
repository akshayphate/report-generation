import React from 'react';
import styles from '../styles/RestrictAccess.module.css'; // Import the CSS module


const RestrictAccess: React.FC = () => {
    return (
        <div className={styles.restrictedAccess}>
            <p>You do not have access to this application. Please contact the application owner.</p>
        </div>
    );
};


export default RestrictAccess;