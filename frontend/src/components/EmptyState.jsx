// File: frontend/src/components/EmptyState.jsx

import React from 'react';

export default function EmptyState({ message, children }) {
    return (
        <div className="text-center p-8 border-2 border-dashed rounded-lg">
            <p className="text-gray-500">{message}</p>
            {children && <div className="mt-4">{children}</div>}
        </div>
    );
}