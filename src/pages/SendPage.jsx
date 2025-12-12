import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SendPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Rediriger vers le tableau de bord qui contient la fonction d'envoi
    navigate('/wallet');
  }, [navigate]);

  return null;
};

export default SendPage;