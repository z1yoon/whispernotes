import React from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Shield, User } from 'lucide-react';
import { useSession } from 'next-auth/react';

const UserButtonContainer = styled.div`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-family: 'Roboto', sans-serif;
  font-weight: 600;
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

interface UserButtonProps {
  onClick?: () => void;
}

export const UserButton: React.FC<UserButtonProps> = ({ onClick }) => {
  const { data: session } = useSession();
  const router = useRouter();
  
  const displayUsername = session?.user?.name || session?.user?.email || 'User';
  const isAdmin = session?.user?.role === 'admin';

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default behavior: navigate to transcripts
      router.push('/transcripts');
    }
  };

  return (
    <UserButtonContainer onClick={handleClick}>
      {isAdmin ? <Shield size={12} /> : <User size={12} />}
      {displayUsername}
    </UserButtonContainer>
  );
};

export default UserButton;