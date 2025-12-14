import React, { useState } from 'react';
import { Card, CardContent, Button } from '../UI';
import OnboardingModal from '../OnboardingModal';
import BlockchainStatus from '../BlockchainStatus';
import TopBar from './TopBar';

const DisconnectedView = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
            
            <Button 
              onClick={() => setIsModalOpen(true)}
              variant="primary"
              className="w-full"
            >
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2">
        <BlockchainStatus />
      </div>

      <OnboardingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnected={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default DisconnectedView;

