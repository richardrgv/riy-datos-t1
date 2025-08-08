// src/components/Tabs.tsx
import React, { useState, useMemo } from 'react';
import './Tabs.css';

interface TabItem {
  id: string;
  title: string;
  component: React.ReactNode;
}

interface TabsProps {
  tabsData: TabItem[];
}

const Tabs: React.FC<TabsProps> = ({ tabsData }) => {
  const [activeTabId, setActiveTabId] = useState(tabsData[0]?.id || null);

  const activeTabContent = useMemo(() => {
    return tabsData.find(tab => tab.id === activeTabId)?.component || null;
  }, [tabsData, activeTabId]);

  if (tabsData.length <= 1) {
    return <div>{activeTabContent}</div>;
  }

  return (
    <div>
      <div className="tab-container"
        style={{
          display: 'flex',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}
      >
        {tabsData.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTabId === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTabId(tab.id)}
          >
            {tab.title}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {activeTabContent}
      </div>
    </div>
  );
};

// Esta línea es la clave y la que faltaba
export default Tabs;