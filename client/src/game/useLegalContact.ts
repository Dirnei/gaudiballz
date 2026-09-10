import { useEffect, useState } from 'react';
import { API } from './identity';

interface LegalContact {
  name: string;
  street: string;
  city: string;
  country: string;
  email: string;
}

interface LegalContactState {
  contact: LegalContact | null;
  loading: boolean;
  configured: boolean;
}

export function useLegalContact(): LegalContactState {
  const [state, setState] = useState<LegalContactState>({
    contact: null,
    loading: true,
    configured: false,
  });

  useEffect(() => {
    fetch(`${API}/api/legal/contact`)
      .then((res) => res.json())
      .then((data: LegalContact) => {
        const configured = !!(data.name || data.street || data.city || data.country || data.email);
        setState({ contact: data, loading: false, configured });
      })
      .catch(() => {
        setState({ contact: null, loading: false, configured: false });
      });
  }, []);

  return state;
}
