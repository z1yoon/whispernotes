'use client'

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { User, Users, BarChart } from 'lucide-react';

// Types
interface UserMention {
  name: string;
  count: number;
}

interface UserCountProps {
  transcriptionId: string;
  initialMentions?: UserMention[];
}

// Styled Components
const UserCountContainer = styled.div`
  margin-top: 1.5rem;
  border-top: 1px solid rgba(136, 80, 242, 0.1);
  padding-top: 1.5rem;
`;

const UserCountHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const UserCountTitle = styled.h4`
  color: #FFFFFF;
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const UserCountItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: rgba(20, 20, 24, 0.5);
  border-radius: 8px;
  margin-bottom: 0.5rem;
`;

const UserNameLabel = styled.div`
  color: #FFFFFF;
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const UserCountValue = styled.div`
  background: rgba(136, 80, 242, 0.2);
  color: #A855F7;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 700;
`;

const BarContainer = styled.div`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const BarGraph = styled.div`
  width: 100%;
  height: 100px;
  background: rgba(20, 20, 24, 0.5);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: flex-end;
  gap: 8px;
`;

const Bar = styled.div<{ $height: number; $color: string }>`
  flex: 1;
  height: ${props => props.$height}%;
  background: ${props => props.$color};
  border-radius: 4px 4px 0 0;
  min-width: 30px;
  position: relative;
  transition: height 0.3s ease;
  
  &:hover {
    opacity: 0.9;
  }
  
  &::after {
    content: attr(data-value);
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    color: #FFFFFF;
    font-size: 0.75rem;
    font-weight: 600;
  }
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #A1A1AA;
`;

const ColorIndicator = styled.div<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: ${props => props.$color};
`;

export const UserCount: React.FC<UserCountProps> = ({
  transcriptionId,
  initialMentions = [
    { name: 'John', count: 15 },
    { name: 'Sarah', count: 9 },
    { name: 'Michael', count: 6 }
  ]
}) => {
  const [mentions, setMentions] = useState<UserMention[]>(initialMentions);
  const [showGraph, setShowGraph] = useState(false);
  
  // Get data from localStorage if available
  useEffect(() => {
    const stored = localStorage.getItem(`userCount-${transcriptionId}`);
    if (stored) {
      setMentions(JSON.parse(stored));
    } else {
      // Save initial data to localStorage
      localStorage.setItem(`userCount-${transcriptionId}`, JSON.stringify(initialMentions));
    }
  }, [transcriptionId, initialMentions]);
  
  // Calculate maximum count for bar graph scaling
  const maxCount = Math.max(...mentions.map(m => m.count));
  
  // Generate colors for users
  const colorMap = {
    'John': '#8850F2',
    'Sarah': '#A855F7',
    'Michael': '#B0E54F',
    'Default': '#10B981'
  };
  
  const getColor = (name: string) => {
    return colorMap[name as keyof typeof colorMap] || colorMap.Default;
  };
  
  return (
    <UserCountContainer>
      <UserCountHeader>
        <UserCountTitle>
          <User size={18} />
          User Mentions
        </UserCountTitle>
        <div 
          style={{ cursor: 'pointer', padding: '4px' }} 
          onClick={() => setShowGraph(!showGraph)}
        >
          {showGraph ? <Users size={18} color="#8D8D99" /> : <BarChart size={18} color="#8D8D99" />}
        </div>
      </UserCountHeader>
      
      {!showGraph ? (
        // List view
        mentions.map((mention, index) => (
          <UserCountItem key={index}>
            <UserNameLabel>
              <User size={16} style={{ color: getColor(mention.name) }} />
              {mention.name}
            </UserNameLabel>
            <UserCountValue>{mention.count}</UserCountValue>
          </UserCountItem>
        ))
      ) : (
        // Graph view
        <BarContainer>
          <BarGraph>
            {mentions.map((mention, index) => (
              <Bar 
                key={index}
                $height={(mention.count / maxCount) * 100}
                $color={getColor(mention.name)}
                data-value={mention.count}
              />
            ))}
          </BarGraph>
          <Legend>
            {mentions.map((mention, index) => (
              <LegendItem key={index}>
                <ColorIndicator $color={getColor(mention.name)} />
                {mention.name}
              </LegendItem>
            ))}
          </Legend>
        </BarContainer>
      )}
    </UserCountContainer>
  );
};

export default UserCount; 