import React from 'react';

interface GenericPageProps {
    title: string;
}

const GenericPage: React.FC<GenericPageProps> = ({ title }) => {
    return (
        <div>
            <h1>{title}</h1>
            <p>Contenido en desarrollo...</p>
        </div>
    );
};

export default GenericPage;