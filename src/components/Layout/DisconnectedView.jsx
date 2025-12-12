import React from 'react';
import { Card, CardContent } from '../UI';
import WalletConnect from '../WalletConnect';
import BlockchainStatus from '../BlockchainStatus';
import TopBar from './TopBar';

const DisconnectedView = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <TopBar />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold mb-2">Connexion requise</h2>
              <p className="text-gray-500">Connectez votre portefeuille pour accéder à vos jetons.</p>
            </div>
            
            <WalletConnect />
          </CardContent>
        </Card>
      </div>
      
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2">
        <BlockchainStatus />
      </div>
    </div>
  );
};

export default DisconnectedView;

