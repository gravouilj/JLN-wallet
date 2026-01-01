import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import PropTypes from 'prop-types';
import { useTranslation } from '../../hooks/useTranslation';

const QrCodeScanner = ({ onAddressDetected }) => {
  const { t } = useTranslation();
  const [error, setError] = useState(null);

  const handleScan = (result) => {
    if (result && result.length > 0) {
      onAddressDetected(result);
    }
  };

  const handleError = (error) => {
    console.error('QR Scanner error:', error);
    setError(error?.message || 'QR Scanner failed');
  };

  const handleRetry = () => {
    setError(null);
  };

  if (error) {
    return (
      <div className="qr-scanner-error">
        <p style={{ color: '#f44336', marginBottom: '8px', fontWeight: '600' }}>
          {t('qr.cameraError') || 'Camera Error: Permission denied. Enter address manually.'}
        </p>
        <button
          onClick={handleRetry}
          className="retry-button"
        >
          {t('qr.retry') || 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="qr-scanner-active">
      <div className="scanner-container">
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '300px',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <Scanner
            onScan={handleScan}
            onError={handleError}
            constraints={{
              facingMode: 'environment',
              width: { ideal: 640 },
              height: { ideal: 480 }
            }}
            styles={{
              container: {
                width: '100%',
                height: 'auto'
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

QrCodeScanner.propTypes = {
  onAddressDetected: PropTypes.func.isRequired,
};

export default QrCodeScanner;
