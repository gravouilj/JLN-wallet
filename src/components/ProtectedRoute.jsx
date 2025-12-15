import { useAtom } from 'jotai';
import { selectedProfileAtom, walletConnectedAtom } from '../atoms';
import PropTypes from 'prop-types';
import DisconnectedView from './Layout/DisconnectedView';

/**
 * Protected route component that ensures wallet is connected AND a profile is selected
 * Redirects to directory if no profile is selected or wallet disconnected
 */
const ProtectedRoute = ({ children, requireProfile = true }) => {
  const [selectedProfile] = useAtom(selectedProfileAtom);
  const [walletConnected] = useAtom(walletConnectedAtom);

  // Show disconnected view if wallet not connected
  if (!walletConnected) {
    return <DisconnectedView />;
  }

  // If profile required but not selected, show disconnected view
  if (requireProfile && !selectedProfile) {
    return <DisconnectedView />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requireProfile: PropTypes.bool,
};

export default ProtectedRoute;
