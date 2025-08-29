// src/components/TabMenu.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './TabMenu.css';

interface Tab {
    path: string;
    name: string;
}

interface TabMenuProps {
    tabs: Tab[];
}

const TabMenu: React.FC<TabMenuProps> = ({ tabs }) => {
    return (
        <div className="tabs-container">
            {tabs.map(tab => (
                <NavLink
                    key={tab.path}
                    to={tab.path}
                    className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}
                >
                    {tab.name}
                </NavLink>
            ))}
        </div>
    );
};

export default TabMenu;