import React from 'react';
import { ShopIcons } from '../components/ShopIcon';

import { GameContainer } from '../components';
import {Headers} from '../components/Header';

export const DashboardPage: React.FC = () => {
  const bgUrl = '/assets/images/dashboard-bg.png';

  return (
    <div className="h-screen  flex flex-col overflow-hidden"
      style={{
        backgroundImage: `url(${bgUrl})`,
        width: '100vw',
        height: '100vh',
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Navigation */}
      <Headers />
      <ShopIcons />

      {/* Main Content */}

      <div className="flex-1 w-full h-0 overflow-hidden">
        <GameContainer />
      </div>
    </div>
  );
};
